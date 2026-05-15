"""
ai_processor.py
---------------
Sends an email subject + body to Gemini and
returns a structured escalation dict parsed from strict JSON.
Includes retry logic with model fallback for quota exhaustion.
"""

import os
import json
import time
import logging
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger("ai_processor")

# ── Configure Gemini ──────────────────────────────────────────────────────────
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Ordered list of models to try — if the primary is quota-exhausted, fall through
_MODEL_CHAIN = [
    os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
]
# deduplicate while preserving order
_MODEL_CHAIN = list(dict.fromkeys(_MODEL_CHAIN))

# ── Strict extraction prompt ──────────────────────────────────────────────────
PROMPT_TEMPLATE = """
You are an enterprise email escalation extraction AI.

Analyze the email carefully and extract escalation information.

Rules:
- Return ONLY valid JSON.
- Do NOT return markdown.
- Do NOT add explanations or preamble.
- If information is missing or unclear, use "Unknown".
- Priority must be exactly one of: ["Fatal", "Critical", "Medium", "Low"]
- Type must be exactly one of: ["Quality", "Legal", "Operations", "Maintenance", "Finance", "Safety", "Other"]
- Zone must be exactly one of: ["North", "South", "East", "West", "Central", "Unknown"]
- Department must be exactly one of: ["Quality", "Legal", "Operations", "Maintenance", "Finance", "Safety", "IT", "Other"]
- "Issue Details" MUST be 3-5 sentences long. Include: what the problem is, where it is happening (project/location), who reported it, what is the impact or urgency, and any specific items or defects mentioned. Do NOT make it a single short phrase.
- Provide a brief reason for the assigned priority in "Priority Reason".

EMAIL SUBJECT:
{EMAIL_SUBJECT}

EMAIL BODY:
{EMAIL_BODY}

Required JSON format:
{{
  "Project": "string",
  "Priority": "Fatal | Critical | Medium | Low",
  "Type": "string",
  "Zone": "string",
  "Department": "string",
  "AssignedTo": "string",
  "Issue Details": "string",
  "Priority Reason": "string"
}}
"""

# Valid enum values — used to sanitise the model's output
VALID_PRIORITIES  = {"Fatal", "Critical", "Medium", "Low"}


def _clean_response(text: str) -> str:
    """Strip markdown code fences that Gemini sometimes adds despite instructions."""
    text = text.strip()
    text = text.replace("```json", "").replace("```", "")
    return text.strip()


def _validate(data: dict) -> dict:
    """Coerce out-of-range enum values to 'Unknown' / 'Other'."""
    if data.get("Priority") not in VALID_PRIORITIES:
        log.warning(f"Unexpected priority '{data.get('Priority')}' — defaulting to 'Medium'")
        data["Priority"] = "Medium"
    return data


def _call_gemini(prompt: str) -> str:
    """Try each model in _MODEL_CHAIN. On quota errors, wait briefly and try next model."""
    last_error = None
    for model_name in _MODEL_CHAIN:
        try:
            log.info(f"Trying model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            log.info(f"Success with model: {model_name}")
            return response.text
        except Exception as exc:
            last_error = exc
            err_str = str(exc).lower()
            if "quota" in err_str or "resource_exhausted" in err_str or "429" in err_str:
                log.warning(f"Quota exhausted on {model_name}, trying next model...")
                time.sleep(2)  # brief pause before fallback
                continue
            elif "not_found" in err_str or "404" in err_str:
                log.warning(f"Model {model_name} not found, trying next...")
                continue
            else:
                # Non-quota error — raise immediately
                raise
    # All models exhausted
    raise last_error or RuntimeError("All Gemini models failed")


def analyze_email(subject: str, body: str) -> dict:
    """
    Call Gemini and return a normalised escalation dict:
    {
        "project":            str,
        "priority":           str,
        "type":               str,
        "zone":               str,
        "department":         str,
        "assignedTo":         str,
        "issueDetails":       str,
        "priorityReason":     str
    }
    Never raises — returns a fallback dict on any error.
    """
    prompt = PROMPT_TEMPLATE.format(
        EMAIL_SUBJECT=subject or "(no subject)",
        EMAIL_BODY=(body or "(empty body)")[:6000],  # guard against huge emails
    )

    try:
        raw_text = _call_gemini(prompt)
        raw = _clean_response(raw_text)
        log.debug(f"Gemini raw response: {raw[:300]}")

        data = json.loads(raw)
        data = _validate(data)

        return {
            "project":        data.get("Project", "Unknown"),
            "priority":       data.get("Priority", "Medium"),
            "type":           data.get("Type", "Other"),
            "zone":           data.get("Zone", "Unknown"),
            "department":     data.get("Department", "Other"),
            "assignedTo":     data.get("AssignedTo", ""),
            "issueDetails":   data.get("Issue Details", "No description extracted."),
            "priorityReason": data.get("Priority Reason", "")
        }

    except json.JSONDecodeError as exc:
        log.error(f"JSON parse error from Gemini: {exc}")
    except Exception as exc:
        log.error(f"Gemini API error: {exc}")

    # Fallback — always return something storable
    return {
        "project":        "Unknown",
        "priority":       "Medium",
        "type":           "Other",
        "zone":           "Unknown",
        "department":     "Other",
        "assignedTo":     "",
        "issueDetails":   f"AI extraction failed. Subject: {subject}",
        "priorityReason": ""
    }


# ── RCA/CAPA AI Rephrase ─────────────────────────────────────────────────────

REPHRASE_PROMPT = """
You are an enterprise RCA/CAPA structuring AI.
Given the root cause analysis and corrective/preventive actions, produce clean structured bullet points.
Return ONLY valid JSON. No markdown. No explanations.

ROOT CAUSE: {ROOT_CAUSE}
CHRONOLOGY: {CHRONOLOGY}
CORRECTIVE ACTIONS: {CORRECTIVE}
PREVENTIVE ACTIONS: {PREVENTIVE}

Required JSON format:
{{
  "rcaBullets": ["string", "string", "string"],
  "capaBullets": ["string", "string", "string", "string"]
}}
"""

def rephrase_rca_capa(root_cause: str, chronology: str, corrective: str, preventive: str) -> dict:
    prompt = REPHRASE_PROMPT.format(
        ROOT_CAUSE=root_cause or "(not provided)",
        CHRONOLOGY=chronology or "(not provided)",
        CORRECTIVE=corrective or "(not provided)",
        PREVENTIVE=preventive or "(not provided)",
    )
    try:
        raw = _call_gemini(prompt)
        data = json.loads(_clean_response(raw))
        return {"rcaBullets": data.get("rcaBullets", []), "capaBullets": data.get("capaBullets", [])}
    except Exception as exc:
        log.error(f"RCA rephrase error: {exc}")
        return {"rcaBullets": [root_cause[:200] if root_cause else "Pending"], "capaBullets": [corrective[:200] if corrective else "Pending"]}


CLASSIFY_PROMPT = """
You are an enterprise complaint classification AI.
Analyze the complaint text and suggest severity and department.
Return ONLY valid JSON. No markdown.
COMPLAINT: {TEXT}
Required JSON:
{{"severity": "Fatal|Critical|Medium|Low", "department": "string", "keywords": ["string"]}}
"""

def classify_complaint(text: str) -> dict:
    prompt = CLASSIFY_PROMPT.format(TEXT=(text or "(empty)")[:4000])
    try:
        raw = _call_gemini(prompt)
        data = json.loads(_clean_response(raw))
        sev = data.get("severity", "Medium")
        if sev not in VALID_PRIORITIES: sev = "Medium"
        return {"severity": sev, "department": data.get("department", "Operations"), "keywords": data.get("keywords", [])}
    except Exception as exc:
        log.error(f"Classify error: {exc}")
        return {"severity": "Medium", "department": "Operations", "keywords": []}
