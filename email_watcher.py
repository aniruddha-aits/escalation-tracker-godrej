"""
email_watcher.py
----------------
IMAP watcher that runs in a background thread.
Calls on_new_email(subject, body) whenever a new message arrives.

Supports:
  - IMAP IDLE (push — zero polling, truly real-time)
  - Polling fallback (every POLL_INTERVAL seconds)
  - Auto-reconnect with exponential backoff
  - All providers: Gmail, Outlook, Yahoo, custom company domains
"""

import imaplib
import email
import os
import re
import socket
import time
import logging
import threading
from email.header import decode_header
from email import policy
from typing import Callable

log = logging.getLogger("email_watcher")

# ── Provider map ──────────────────────────────────────────────────────────────
IMAP_SERVERS = {
    "gmail.com":      {"host": "imap.gmail.com",        "port": 993},
    "googlemail.com": {"host": "imap.gmail.com",        "port": 993},
    "outlook.com":    {"host": "outlook.office365.com", "port": 993},
    "hotmail.com":    {"host": "outlook.office365.com", "port": 993},
    "live.com":       {"host": "outlook.office365.com", "port": 993},
    "yahoo.com":      {"host": "imap.mail.yahoo.com",   "port": 993},
    "icloud.com":     {"host": "imap.mail.me.com",      "port": 993},
    "protonmail.com": {"host": "127.0.0.1",             "port": 1143},
}

CUSTOM_IMAP_HOST = os.getenv("CUSTOM_IMAP_HOST")
CUSTOM_IMAP_PORT = int(os.getenv("CUSTOM_IMAP_PORT", 993))
IDLE_REFRESH_SECS = 28 * 60   # RFC 2177 keepalive


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_imap_server(addr: str) -> dict:
    domain = addr.split("@")[-1].lower()
    if domain in IMAP_SERVERS:
        return IMAP_SERVERS[domain]
    if CUSTOM_IMAP_HOST:
        return {"host": CUSTOM_IMAP_HOST, "port": CUSTOM_IMAP_PORT}
    return {"host": f"mail.{domain}", "port": 993}


def _decode_header(raw: str) -> str:
    parts = decode_header(raw or "")
    out = []
    for part, enc in parts:
        if isinstance(part, bytes):
            out.append(part.decode(enc or "utf-8", errors="replace"))
        else:
            out.append(str(part))
    return "".join(out)


def _strip_html(html: str) -> str:
    txt = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    txt = re.sub(r"<script[^>]*>.*?</script>", "", txt,  flags=re.DOTALL | re.IGNORECASE)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"[ \t]{2,}", " ", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    return txt.strip()


def parse_email_date(date_str: str) -> str:
    import email.utils
    import datetime
    try:
        if date_str:
            d = email.utils.parsedate_to_datetime(date_str)
            if d.tzinfo is None:
                d = d.replace(tzinfo=datetime.timezone.utc)
            return d.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception:
        pass
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def _extract_body(msg: email.message.Message) -> str:
    plain, html = [], []
    if msg.is_multipart():
        for part in msg.walk():
            if "attachment" in str(part.get("Content-Disposition", "")):
                continue
            payload = part.get_payload(decode=True)
            if payload is None:
                continue
            charset = part.get_content_charset() or "utf-8"
            text = payload.decode(charset, errors="replace")
            ct = part.get_content_type()
            if ct == "text/plain":
                plain.append(text)
            elif ct == "text/html":
                html.append(text)
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            text = payload.decode(charset, errors="replace")
            if msg.get_content_type() == "text/html":
                html.append(text)
            else:
                plain.append(text)

    if plain:
        return "\n".join(plain).strip()
    if html:
        return _strip_html("\n".join(html))
    return ""


# ── IMAP connection helpers ───────────────────────────────────────────────────

def _connect(addr: str, password: str, mailbox: str) -> imaplib.IMAP4_SSL:
    info = _get_imap_server(addr)
    log.info(f"Connecting to {info['host']}:{info['port']} …")
    mail = imaplib.IMAP4_SSL(info["host"], info["port"])
    mail.login(addr, password)
    status, data = mail.select(mailbox)
    if status != "OK":
        raise RuntimeError(f"Cannot open mailbox '{mailbox}': {data}")
    log.info(f"Authenticated as {addr}  |  mailbox: {mailbox}")
    return mail


def _supports_idle(mail: imaplib.IMAP4_SSL) -> bool:
    _, caps = mail.capability()
    return b"IDLE" in caps[0].upper()


def _get_max_uid(mail: imaplib.IMAP4_SSL) -> int:
    """Return highest UID using UID SEARCH (never sequence numbers)."""
    status, data = mail.uid("search", None, "ALL")
    if status != "OK" or not data[0]:
        return 0
    uids = data[0].split()
    return int(uids[-1]) if uids else 0


def _fetch_emails_after(mail: imaplib.IMAP4_SSL, last_uid: int) -> tuple[list[dict], int]:
    """
    Fetch all messages with UID > last_uid.
    All operations use UIDs — no sequence numbers involved.
    """
    uid_range = f"{last_uid + 1}:*"
    status, data = mail.uid("search", None, f"UID {uid_range}")

    if status != "OK" or not data[0]:
        return [], last_uid

    new_uids = [u for u in data[0].split() if int(u) > last_uid]
    if not new_uids:
        return [], last_uid

    log.info(f"New UIDs: {[u.decode() for u in new_uids]}")
    emails = []
    for uid in new_uids:
        status, msg_data = mail.uid("fetch", uid, "(RFC822)")
        if status != "OK" or not msg_data or msg_data[0] is None:
            log.warning(f"Could not fetch UID {uid.decode()}")
            continue
        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw, policy=policy.compat32)
        emails.append({
            "subject":     _decode_header(msg.get("Subject", "(no subject)")),
            "body":        _extract_body(msg),
            "from":        _decode_header(msg.get("From", "")),
            "from_header": _decode_header(msg.get("From", "")),
            "date":        msg.get("Date"),
        })

    new_max = int(new_uids[-1]) if new_uids else last_uid
    return emails, new_max


def _idle_wait(mail: imaplib.IMAP4_SSL, timeout: int = IDLE_REFRESH_SECS) -> bool:
    """Block in IMAP IDLE until server pushes EXISTS/RECENT or timeout."""
    tag = mail._new_tag().decode()
    mail.send(f"{tag} IDLE\r\n".encode())
    mail.readline()   # consume "+ idling"

    mail.socket().settimeout(timeout)
    new_mail = False
    try:
        while True:
            line = mail.readline().decode(errors="replace").strip()
            log.debug(f"IDLE ← {line!r}")
            if not line:
                break
            if "EXISTS" in line or "RECENT" in line:
                new_mail = True
                break
    except socket.timeout:
        pass
    finally:
        mail.socket().settimeout(None)
        mail.send(b"DONE\r\n")
        try:
            mail.readline()
        except Exception:
            pass
    return new_mail


# ── Main watcher (runs in a daemon thread) ────────────────────────────────────

def _watch_loop(
    email_address: str,
    password: str,
    mailbox: str,
    poll_interval: int,
    on_new_email: Callable[[str, str], None],
    stop_event: threading.Event,
) -> None:
    mail     = None
    last_uid = 0
    use_idle = None
    backoff  = 5

    while not stop_event.is_set():
        try:
            if mail is None:
                mail = _connect(email_address, password, mailbox)
                if last_uid == 0:
                    last_uid = _get_max_uid(mail)
                    log.info(f"Baseline UID = {last_uid}. Watching for new mail …")
                else:
                    log.info(f"Reconnected. Resuming from UID {last_uid} …")
                use_idle = _supports_idle(mail)
                log.info(f"Mode: {'IMAP IDLE (push)' if use_idle else f'polling every {poll_interval}s'}")
                backoff = 5

            # Wait for notification
            if use_idle:
                has_new = _idle_wait(mail)
            else:
                stop_event.wait(poll_interval)
                has_new = True

            if stop_event.is_set():
                break

            if has_new:
                new_emails, last_uid = _fetch_emails_after(mail, last_uid)
                for em in new_emails:
                    log.info(f"New email: {em['subject']}")
                    try:
                        parsed_date = parse_email_date(em.get("date"))
                        on_new_email(em["subject"], em["body"], from_header=em.get("from_header", ""), received_at=parsed_date)
                    except Exception as cb_exc:
                        log.error(f"Callback error: {cb_exc}")

        except (imaplib.IMAP4.abort, imaplib.IMAP4.error, OSError, socket.error) as exc:
            log.warning(f"Connection dropped: {exc} — retry in {backoff}s")
            try:
                mail.logout()
            except Exception:
                pass
            mail = None
            stop_event.wait(backoff)
            backoff = min(backoff * 2, 120)

        except Exception as exc:
            log.error(f"Unexpected error: {exc} — retry in {backoff}s")
            mail = None
            stop_event.wait(backoff)
            backoff = min(backoff * 2, 120)

    # Clean shutdown
    if mail:
        try:
            mail.logout()
        except Exception:
            pass
    log.info("Email watcher stopped.")


def start_watcher(
    email_address: str,
    password: str,
    on_new_email: Callable[[str, str], None],
    mailbox: str = "INBOX",
    poll_interval: int = 30,
) -> threading.Event:
    """
    Start the IMAP watcher in a background daemon thread.
    Returns a stop_event — call stop_event.set() to gracefully shut down.
    """
    stop_event = threading.Event()
    thread = threading.Thread(
        target=_watch_loop,
        args=(email_address, password, mailbox, poll_interval, on_new_email, stop_event),
        daemon=True,
        name="email-watcher",
    )
    thread.start()
    log.info("Email watcher thread started.")
    return stop_event
