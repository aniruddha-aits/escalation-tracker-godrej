"""
app.py — Flask REST API backend for Escalation Tracker.
All routes return JSON. No template rendering.
"""
import os, re, logging, json, jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import check_password_hash

import database
import ai_processor
from email_watcher import start_watcher

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("app")

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "jwt-secret-change-me")
JWT_EXP_HOURS = 24

CORS(app, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")}},
     supports_credentials=True)

_watcher_ref = {"email_address": None, "password": None, "mailbox": "INBOX", "on_new_email": None}

# ── Auth decorator ────────────────────────────────────────────────────────────

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
        if not token:
            return jsonify({"success": False, "message": "Token missing"}), 401
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            g.current_user = database.get_user_by_id(data["user_id"])
            if not g.current_user:
                return jsonify({"success": False, "message": "User not found"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

def _extract_sender(from_header):
    match = re.match(r'^(.*?)\s*<(.+?)>\s*$', from_header)
    if match:
        return match.group(1).strip().strip('"'), match.group(2).strip()
    return "", from_header.strip()

def handle_new_email(subject, body, from_header=""):
    log.info(f"Processing email: {subject[:80]}")
    from_name, from_email = _extract_sender(from_header)
    result = ai_processor.analyze_email(subject, body)
    database.save_email(from_email=from_email, from_name=from_name, subject=subject, body=body, ai_data=result)

# ── Auth routes ───────────────────────────────────────────────────────────────

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.json or {}
    email = data.get("email", "")
    password = data.get("password", "")
    user = database.get_user_by_email(email)
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"success": False, "message": "Invalid credentials"}), 401
    token = jwt.encode({"user_id": user.id, "exp": datetime.utcnow() + timedelta(hours=JWT_EXP_HOURS)},
                       JWT_SECRET, algorithm="HS256")
    return jsonify({"success": True, "token": token, "user": user.to_dict()})

@app.route("/api/auth/me")
@token_required
def api_me():
    return jsonify({"success": True, "user": g.current_user.to_dict()})

# ── Config / Enums ────────────────────────────────────────────────────────────

@app.route("/api/config/enums")
def api_enums():
    return jsonify({"success": True, "data": {
        "severities": ["Fatal","Critical","Medium","Low"],
        "statuses": ["New","Pending Validation","Under Review","Assigned","RCA Pending",
                     "CAPA Pending","RCA Submitted","Rectification Done","Awaiting Customer Closure","Closed","SLA Breached"],
        "zones": ["North","South","East","West","Central"],
        "projects": ["Godrej One Worli","Godrej Reserve Whitefield","Godrej Splendour",
                     "Godrej Meridien","Godrej Nurture","Godrej Infinity","Godrej Air"],
        "sources": ["Email","WhatsApp","LinkedIn","Chairman Mail","CEO Mail","CQO Mail","Social Media"],
        "types": ["Structural","Quality","Legal","Safety","Documentation","Maintenance","Financial","Other"],
        "departments": ["Legal","Quality","Operations","Finance","Customer Relations","Engineering","Procurement","HR"],
        "roles": ["Admin","Management","Authority","Department User","Reviewer"],
    }})

# ── Complaints ────────────────────────────────────────────────────────────────

@app.route("/api/complaints", methods=["GET"])
@token_required
def api_get_complaints():
    filters = {k: request.args.get(k) for k in ["status","severity","zone","department","search","assignedTo"]}
    if g.current_user.role == "Department User":
        filters["assignedTo"] = g.current_user.id
    complaints = database.get_all_complaints(filters)
    return jsonify({"success": True, "data": [c.to_dict() for c in complaints]})

@app.route("/api/complaints", methods=["POST"])
@token_required
def api_create_complaint():
    data = request.json or {}
    cid = database.create_complaint(data)
    database.create_notification("VALIDATION", cid, "", "New Complaint Awaiting Validation",
        f"{cid} ({data.get('project','')}) requires AI validation review.", data.get("severity","Medium"))
    return jsonify({"success": True, "id": cid, "message": "Complaint created"})

@app.route("/api/complaints/<cid>", methods=["GET"])
@token_required
def api_get_complaint(cid):
    c = database.get_complaint_by_id(cid)
    if not c:
        return jsonify({"success": False, "message": "Not found"}), 404
    return jsonify({"success": True, "data": c.to_dict()})

@app.route("/api/complaints/<cid>", methods=["PUT"])
@token_required
def api_update_complaint(cid):
    database.update_complaint(cid, request.json or {})
    return jsonify({"success": True, "message": "Updated"})

@app.route("/api/complaints/<cid>", methods=["DELETE"])
@token_required
def api_delete_complaint(cid):
    database.delete_complaint(cid)
    return jsonify({"success": True, "message": "Deleted"})

@app.route("/api/complaints/<cid>/actions", methods=["POST"])
@token_required
def api_add_action(cid):
    data = request.json or {}
    c = database.get_complaint_by_id(cid)
    if not c:
        return jsonify({"success": False, "message": "Not found"}), 404
    actions = c.actions or []
    actions.append({"by": g.current_user.id, "at": datetime.now().isoformat(), "text": data.get("text","")})
    database.update_complaint(cid, {"actions": actions})
    return jsonify({"success": True, "message": "Action added"})

@app.route("/api/complaints/<cid>/assign", methods=["POST"])
@token_required
def api_assign_complaint(cid):
    data = request.json or {}
    updates = {"status": "Assigned"}
    if data.get("department"): updates["department"] = data["department"]
    if data.get("assignedTo"): updates["assignedTo"] = data["assignedTo"]
    if data.get("cbeDate"): updates["cbeDate"] = data["cbeDate"]
    database.update_complaint(cid, updates)
    database.create_notification("ASSIGNMENT", cid, data.get("assignedTo",""),
        "New Complaint Assigned", f"{cid} has been assigned.", data.get("severity","Medium"))
    return jsonify({"success": True, "message": "Assigned"})

@app.route("/api/complaints/<cid>/validate", methods=["POST"])
@token_required
def api_validate_complaint(cid):
    data = request.json or {}
    updates = {"status": "Under Review", "validatedBy": g.current_user.id,
               "validatedAt": datetime.now().isoformat()}
    for k in ["severity","department","project","zone","notes"]:
        if data.get(k): updates[k] = data[k]
    database.update_complaint(cid, updates)
    return jsonify({"success": True, "message": "Validated"})

@app.route("/api/complaints/<cid>/reject", methods=["POST"])
@token_required
def api_reject_complaint(cid):
    database.update_complaint(cid, {"status": "New", "validatedBy": None})
    return jsonify({"success": True, "message": "Rejected"})

# ── RCA/CAPA ──────────────────────────────────────────────────────────────────

@app.route("/api/complaints/<cid>/rca", methods=["POST"])
@token_required
def api_submit_rca(cid):
    data = request.json or {}
    rca = {"rootCause": data.get("rootCause",""), "chronology": data.get("chronology",""),
           "aiRephrased": data.get("aiRephrased",[]), "submittedBy": g.current_user.id,
           "submittedAt": datetime.now().isoformat(), "approvedBy": None, "approvedAt": None}
    capa = {"corrective": data.get("corrective",""), "preventive": data.get("preventive",""),
            "aiRephrased": data.get("capaAiRephrased",[]),
            "approvedBy": None, "approvedAt": None}
    database.update_complaint(cid, {"rca": rca, "capa": capa, "status": "RCA Submitted"})
    database.create_notification("RCA_SUBMITTED", cid, "", "RCA Submitted — Pending Approval",
        f"RCA for {cid} submitted by {g.current_user.name}.", data.get("severity","Medium"))
    return jsonify({"success": True, "message": "RCA submitted"})

@app.route("/api/complaints/<cid>/rca/approve", methods=["POST"])
@token_required
def api_approve_rca(cid):
    c = database.get_complaint_by_id(cid)
    if not c or not c.rca:
        return jsonify({"success": False, "message": "No RCA found"}), 400
    now = datetime.now().isoformat()
    rca = {**c.rca, "approvedBy": g.current_user.id, "approvedAt": now}
    capa = {**c.capa, "approvedBy": g.current_user.id, "approvedAt": now} if c.capa else c.capa
    database.update_complaint(cid, {"rca": rca, "capa": capa, "status": "Rectification Done"})
    return jsonify({"success": True, "message": "RCA approved"})

@app.route("/api/complaints/<cid>/rca/return", methods=["POST"])
@token_required
def api_return_rca(cid):
    database.update_complaint(cid, {"status": "RCA Pending", "rca": None, "capa": None})
    return jsonify({"success": True, "message": "RCA returned"})

@app.route("/api/complaints/<cid>/rca/ai-rephrase", methods=["POST"])
@token_required
def api_rephrase_rca(cid):
    data = request.json or {}
    result = ai_processor.rephrase_rca_capa(
        data.get("rootCause",""), data.get("chronology",""),
        data.get("corrective",""), data.get("preventive",""))
    return jsonify({"success": True, "data": result})

# ── Closure ───────────────────────────────────────────────────────────────────

@app.route("/api/complaints/<cid>/close/soft", methods=["POST"])
@token_required
def api_soft_close(cid):
    database.update_complaint(cid, {"status": "Awaiting Customer Closure", "closureStatus": "Awaiting Customer Closure"})
    return jsonify({"success": True, "message": "Soft closure done"})

@app.route("/api/complaints/<cid>/close/hard", methods=["POST"])
@token_required
def api_hard_close(cid):
    data = request.json or {}
    database.update_complaint(cid, {
        "status": "Closed", "closureStatus": "Closed",
        "customerConfirmation": {"receivedAt": datetime.now().isoformat(), "note": data.get("note","Closed by authority.")},
        "closureMethod": data.get("closureMethod","")})
    database.create_notification("CLOSURE", cid, "", "Complaint Closed", f"{cid} has been closed.", "Low")
    return jsonify({"success": True, "message": "Hard closure done"})

# ── AI Classification (manual complaint) ──────────────────────────────────────

@app.route("/api/complaints/ai-classify", methods=["POST"])
@token_required
def api_ai_classify():
    data = request.json or {}
    result = ai_processor.classify_complaint(data.get("text",""))
    return jsonify({"success": True, "data": result})

# ── Email Inbox ───────────────────────────────────────────────────────────────

@app.route("/api/emails")
@token_required
def api_emails():
    emails = database.get_all_emails()
    return jsonify({"success": True, "data": emails, "total": len(emails)})

@app.route("/api/emails/sync", methods=["POST"])
@token_required
def api_sync_emails():
    addr = _watcher_ref["email_address"]
    pwd = _watcher_ref["password"]
    if not addr or not pwd:
        return jsonify({"success": False, "message": "Email watcher not configured"}), 400
    import imaplib
    from email_watcher import _connect, _decode_header, _extract_body
    import email as email_lib
    from email import policy
    try:
        mail = _connect(addr, pwd, _watcher_ref["mailbox"])
        status, data = mail.uid("search", None, "ALL")
        if status != "OK" or not data[0]:
            mail.logout()
            return jsonify({"success": True, "message": "No emails", "fetched": 0})
        all_uids = data[0].split()
        recent = all_uids[-20:] if len(all_uids) > 20 else all_uids
        fetched = 0
        for uid in recent:
            status, msg_data = mail.uid("fetch", uid, "(RFC822)")
            if status != "OK" or not msg_data or msg_data[0] is None:
                continue
            raw = msg_data[0][1]
            msg = email_lib.message_from_bytes(raw, policy=policy.compat32)
            subject = _decode_header(msg.get("Subject", "(no subject)"))
            body = _extract_body(msg)
            from_header = _decode_header(msg.get("From", ""))
            from_name, from_email = _extract_sender(from_header)
            with database.get_connection() as conn:
                exists = conn.execute("SELECT COUNT(*) FROM emails WHERE subject=? AND from_email=?", (subject, from_email)).fetchone()[0]
            if exists > 0:
                continue
            result = ai_processor.analyze_email(subject, body)
            database.save_email(from_email=from_email, from_name=from_name, subject=subject, body=body, ai_data=result)
            fetched += 1
        mail.logout()
        return jsonify({"success": True, "message": f"Fetched {fetched} new email(s)", "fetched": fetched})
    except Exception as exc:
        log.error(f"Sync error: {exc}")
        return jsonify({"success": False, "message": str(exc)}), 500

@app.route("/api/emails/<eid>/process-ai", methods=["POST"])
@token_required
def api_process_email_ai(eid):
    em = database.get_email_by_id(eid)
    if not em:
        return jsonify({"success": False, "message": "Not found"}), 404
    result = ai_processor.analyze_email(em.get("subject",""), em.get("body",""))
    database.update_email_ai_data(eid, result)
    return jsonify({"success": True, "data": result})

@app.route("/api/emails/<eid>/send-to-queue", methods=["POST"])
@token_required
def api_send_to_queue(eid):
    em = database.get_email_by_id(eid)
    if not em:
        return jsonify({"success": False, "message": "Not found"}), 404
    overrides = request.json or {}
    ai = em.get("ai_data", {})
    now = datetime.now()
    cid = database.create_complaint({
        "project": overrides.get("project") or ai.get("project", "Unknown"),
        "severity": overrides.get("severity") or ai.get("priority", "Medium"),
        "type": overrides.get("type") or ai.get("type", "Other"),
        "zone": overrides.get("zone") or ai.get("zone", "Unknown"),
        "department": overrides.get("department") or ai.get("department"),
        "source": em.get("source", "Email"),
        "issueDetails": overrides.get("issueDetails") or ai.get("issueDetails", em.get("subject","")),
        "notes": f"Promoted from Email Inbox. From: {em.get('from_email','')}",
        "raisedOn": em.get("received_at") or now.isoformat(),
        "slaStarted": em.get("received_at") or now.isoformat(),
        "customerName": overrides.get("customerName") or ai.get("customerName",""),
        "customerEmail": em.get("from_email",""),
        "aiExtracted": {"keywords": ai.get("keywords",[]), "confidence": ai.get("confidence",0.8),
                        "suggestedSeverity": ai.get("priority","Medium"),
                        "suggestedDepartment": ai.get("department","Other")},
    })
    database.update_email_status(eid, "queued")
    return jsonify({"success": True, "message": "Sent to queue", "complaintId": cid})

@app.route("/api/emails/<eid>/reject", methods=["POST"])
@token_required
def api_reject_email(eid):
    database.reject_email(eid)
    return jsonify({"success": True, "message": "Email rejected"})

# ── Notifications ─────────────────────────────────────────────────────────────

@app.route("/api/notifications")
@token_required
def api_notifications():
    notifs = database.get_notifications(g.current_user.id)
    return jsonify({"success": True, "data": [n.to_dict() for n in notifs]})

@app.route("/api/notifications/<nid>/read", methods=["PUT"])
@token_required
def api_mark_read(nid):
    database.mark_notification_read(nid)
    return jsonify({"success": True})

@app.route("/api/notifications/read-all", methods=["PUT"])
@token_required
def api_mark_all_read():
    database.mark_all_notifications_read(g.current_user.id)
    return jsonify({"success": True})

# ── Analytics ─────────────────────────────────────────────────────────────────

@app.route("/api/analytics/dashboard")
@token_required
def api_dashboard():
    return jsonify({"success": True, "data": database.get_dashboard_stats()})

@app.route("/api/analytics/reports")
@token_required
def api_reports():
    return jsonify({"success": True, "data": database.get_analytics_data()})

# ── Admin: Users ──────────────────────────────────────────────────────────────

@app.route("/api/admin/users")
@token_required
def api_get_users():
    users = database.get_all_users()
    return jsonify({"success": True, "data": [u.to_dict() for u in users]})

@app.route("/api/admin/users", methods=["POST"])
@token_required
def api_create_user():
    uid = database.create_user(request.json or {})
    return jsonify({"success": True, "id": uid})

@app.route("/api/admin/users/<uid>", methods=["PUT"])
@token_required
def api_update_user(uid):
    database.update_user(uid, request.json or {})
    return jsonify({"success": True, "message": "Updated"})

@app.route("/api/admin/users/<uid>", methods=["DELETE"])
@token_required
def api_delete_user(uid):
    database.delete_user(uid)
    return jsonify({"success": True, "message": "Deleted"})

# ── Admin: Departments ────────────────────────────────────────────────────────

@app.route("/api/admin/departments")
@token_required
def api_get_departments():
    depts = database.get_all_departments()
    return jsonify({"success": True, "data": [d.to_dict() for d in depts]})

@app.route("/api/admin/departments", methods=["POST"])
@token_required
def api_create_department():
    did = database.create_department(request.json or {})
    return jsonify({"success": True, "id": did})

@app.route("/api/admin/departments/<did>", methods=["PUT"])
@token_required
def api_update_department(did):
    database.update_department(did, request.json or {})
    return jsonify({"success": True, "message": "Updated"})

# ── Admin: Matrix ─────────────────────────────────────────────────────────────

@app.route("/api/admin/matrix")
@token_required
def api_get_matrix():
    rows = database.get_escalation_matrix()
    return jsonify({"success": True, "data": [r.to_dict() for r in rows]})

@app.route("/api/admin/matrix/<int:mid>", methods=["PUT"])
@token_required
def api_update_matrix(mid):
    database.update_matrix_row(mid, request.json or {})
    return jsonify({"success": True, "message": "Updated"})

# ── Startup ───────────────────────────────────────────────────────────────────

def start():
    database.init_db()
    database.seed_data()
    email_address = os.getenv("EMAIL_ADDRESS")
    email_password = os.getenv("EMAIL_PASSWORD")
    if email_address and email_password:
        _watcher_ref["email_address"] = email_address
        _watcher_ref["password"] = email_password
        _watcher_ref["mailbox"] = os.getenv("MAILBOX", "INBOX")
        _watcher_ref["on_new_email"] = handle_new_email
        start_watcher(email_address=email_address, password=email_password,
            on_new_email=handle_new_email, mailbox=os.getenv("MAILBOX","INBOX"),
            poll_interval=int(os.getenv("POLL_INTERVAL",30)))
    else:
        log.warning("EMAIL credentials not set — watcher disabled.")
    port = int(os.getenv("FLASK_PORT", 5000))
    log.info(f"API server → http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)

if __name__ == "__main__":
    start()
