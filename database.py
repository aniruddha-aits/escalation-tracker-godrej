"""
database.py - SQLite helper with full schema for all modules.
"""
import sqlite3, uuid, json, logging
from datetime import datetime, timedelta
from pathlib import Path
from werkzeug.security import generate_password_hash
from models import User, Complaint, Notification, Department, MatrixRow

log = logging.getLogger("database")
DB_PATH = Path(__file__).parent / "instance" / "escalations.db"

def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_connection() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL, role TEXT NOT NULL, department TEXT DEFAULT '',
            zone TEXT DEFAULT 'All', avatar TEXT DEFAULT '', is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS complaints (
            id TEXT PRIMARY KEY, project TEXT, type TEXT, severity TEXT DEFAULT 'Medium',
            source TEXT DEFAULT 'Email', raised_on TEXT, zone TEXT, issue_details TEXT,
            notes TEXT, status TEXT DEFAULT 'Pending Validation', department TEXT,
            assigned_to TEXT, watchers TEXT DEFAULT '[]', mail_thread TEXT,
            customer_name TEXT, customer_email TEXT, ai_extracted TEXT DEFAULT '{}',
            validated_by TEXT, validated_at TEXT, sla_started TEXT, rca_due TEXT,
            closure_due TEXT, actions TEXT DEFAULT '[]', cbe_date TEXT,
            rca TEXT, capa TEXT, closure_status TEXT, customer_confirmation TEXT,
            closure_method TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS emails (
            id TEXT PRIMARY KEY, from_email TEXT, from_name TEXT, subject TEXT,
            body TEXT, ai_data TEXT DEFAULT '{}', status TEXT DEFAULT 'pending',
            source TEXT DEFAULT 'Email', received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY, type TEXT NOT NULL, complaint_id TEXT,
            user_id TEXT, title TEXT, message TEXT, severity TEXT DEFAULT 'Medium',
            read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, head TEXT DEFAULT '',
            escalate_to TEXT DEFAULT '', issue_types TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS escalation_matrix (
            id INTEGER PRIMARY KEY AUTOINCREMENT, severity TEXT UNIQUE NOT NULL,
            action_start INTEGER, rca INTEGER, closure INTEGER,
            level1 TEXT, level2 TEXT, level3 TEXT
        );
        """)
        # ── migrations for CBE approval workflow ──
        for col, defn in [
            ("assigned_by", "TEXT"),
            ("cbe_status", "TEXT"),
            ("cbe_submitted_by", "TEXT"),
            ("cbe_approved_by", "TEXT"),
            ("cbe_approved_at", "TEXT"),
        ]:
            try:
                c.execute(f"ALTER TABLE complaints ADD COLUMN {col} {defn}")
            except Exception:
                pass  # column already exists
        for col, defn in [
            ("complaint_id", "TEXT"),
        ]:
            try:
                c.execute(f"ALTER TABLE emails ADD COLUMN {col} {defn}")
            except Exception:
                pass
        c.commit()
    log.info(f"Database ready at {DB_PATH}")

# ── JSON helpers ──
def _json_loads(val, default=None):
    if default is None: default = {}
    try: return json.loads(val or json.dumps(default))
    except: return default

# ── User helpers ──
def _row_to_user(row):
    return User(id=row["id"], name=row["name"], email=row["email"],
        password_hash=row["password_hash"], role=row["role"],
        department=row["department"] or "", zone=row["zone"] or "All",
        avatar=row["avatar"] or "", is_active=bool(row["is_active"]),
        created_at=row["created_at"] or "")

def get_user_by_email(email):
    with get_connection() as c:
        row = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    return _row_to_user(row) if row else None

def get_user_by_id(uid):
    with get_connection() as c:
        row = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    return _row_to_user(row) if row else None

def get_all_users():
    with get_connection() as c:
        rows = c.execute("SELECT * FROM users ORDER BY name").fetchall()
    return [_row_to_user(r) for r in rows]

def create_user(data):
    uid = str(uuid.uuid4())
    name = data.get("name","")
    avatar = "".join(w[0] for w in name.split()[:2]).upper()
    pw = generate_password_hash(data.get("password","demo1234"))
    with get_connection() as c:
        c.execute("INSERT INTO users (id,name,email,password_hash,role,department,zone,avatar) VALUES (?,?,?,?,?,?,?,?)",
            (uid, name, data.get("email",""), pw, data.get("role","Reviewer"),
             data.get("department",""), data.get("zone","All"), avatar))
        c.commit()
    return uid

def update_user(uid, data):
    sets, vals = [], []
    for k in ["name","email","role","department","zone","is_active"]:
        if k in data:
            sets.append(f"{k}=?"); vals.append(data[k])
    if not sets: return
    vals.append(uid)
    with get_connection() as c:
        c.execute(f"UPDATE users SET {','.join(sets)} WHERE id=?", vals)
        c.commit()

def delete_user(uid):
    with get_connection() as c:
        c.execute("DELETE FROM users WHERE id=?", (uid,))
        c.commit()

# ── Complaint helpers ──
def _row_to_complaint(row):
    return Complaint(
        id=row["id"], project=row["project"] or "", type=row["type"] or "",
        severity=row["severity"] or "Medium", source=row["source"] or "Email",
        raisedOn=row["raised_on"] or "", zone=row["zone"] or "",
        issueDetails=row["issue_details"] or "", notes=row["notes"] or "",
        status=row["status"] or "Pending Validation",
        department=row["department"], assignedTo=row["assigned_to"],
        assignedBy=row["assigned_by"] if "assigned_by" in row.keys() else None,
        watchers=_json_loads(row["watchers"], []),
        mailThread=row["mail_thread"],
        customerName=row["customer_name"] or "",
        customerEmail=row["customer_email"] or "",
        aiExtracted=_json_loads(row["ai_extracted"]),
        validatedBy=row["validated_by"], validatedAt=row["validated_at"],
        slaStarted=row["sla_started"], rcaDue=row["rca_due"],
        closureDue=row["closure_due"],
        actions=_json_loads(row["actions"], []),
        cbeDate=row["cbe_date"],
        cbeStatus=row["cbe_status"] if "cbe_status" in row.keys() else None,
        cbeSubmittedBy=row["cbe_submitted_by"] if "cbe_submitted_by" in row.keys() else None,
        cbeApprovedBy=row["cbe_approved_by"] if "cbe_approved_by" in row.keys() else None,
        cbeApprovedAt=row["cbe_approved_at"] if "cbe_approved_at" in row.keys() else None,
        rca=_json_loads(row["rca"]) if row["rca"] else None,
        capa=_json_loads(row["capa"]) if row["capa"] else None,
        closureStatus=row["closure_status"],
        customerConfirmation=_json_loads(row["customer_confirmation"]) if row["customer_confirmation"] else None,
        closureMethod=row["closure_method"],
        created_at=row["created_at"] or "")

def create_complaint(data):
    cid = data.get("id") or f"ESC-{datetime.now().strftime('%Y')}-{str(uuid.uuid4())[:8].upper()}"
    now = datetime.now().isoformat()
    severity = data.get("severity","Medium")
    sla_map = {"Fatal":{"rca":24,"closure":72},"Critical":{"rca":48,"closure":120},
               "Medium":{"rca":72,"closure":168},"Low":{"rca":96,"closure":240}}
    sla = sla_map.get(severity, sla_map["Medium"])
    sla_started = data.get("slaStarted") or now
    base = datetime.fromisoformat(sla_started.replace("Z",""))
    rca_due = data.get("rcaDue") or (base + timedelta(hours=sla["rca"])).isoformat()
    closure_due = data.get("closureDue") or (base + timedelta(hours=sla["closure"])).isoformat()

    with get_connection() as c:
        c.execute("""INSERT INTO complaints (id,project,type,severity,source,raised_on,zone,
            issue_details,notes,status,department,assigned_to,assigned_by,watchers,mail_thread,
            customer_name,customer_email,ai_extracted,validated_by,validated_at,
            sla_started,rca_due,closure_due,actions,cbe_date,cbe_status,cbe_submitted_by,
            cbe_approved_by,cbe_approved_at,rca,capa,
            closure_status,customer_confirmation,closure_method)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (cid, data.get("project",""), data.get("type",""), severity,
             data.get("source","Email"), data.get("raisedOn") or now,
             data.get("zone",""), data.get("issueDetails",""), data.get("notes",""),
              data.get("status","Pending Validation"), data.get("department"),
              data.get("assignedTo"), data.get("assignedBy"),
              json.dumps(data.get("watchers",[])),
              data.get("mailThread"), data.get("customerName",""),
              data.get("customerEmail",""), json.dumps(data.get("aiExtracted",{})),
              data.get("validatedBy"), data.get("validatedAt"),
              sla_started, rca_due, closure_due,
              json.dumps(data.get("actions",[])), data.get("cbeDate"),
              data.get("cbeStatus"), data.get("cbeSubmittedBy"),
              data.get("cbeApprovedBy"), data.get("cbeApprovedAt"),
              json.dumps(data.get("rca")) if data.get("rca") else None,
             json.dumps(data.get("capa")) if data.get("capa") else None,
             data.get("closureStatus"), 
             json.dumps(data.get("customerConfirmation")) if data.get("customerConfirmation") else None,
             data.get("closureMethod")))
        c.commit()
    return cid

def get_all_complaints(filters=None):
    q = "SELECT * FROM complaints WHERE 1=1"
    p = []
    if filters:
        if filters.get("status"): q += " AND status=?"; p.append(filters["status"])
        if filters.get("severity"): q += " AND severity=?"; p.append(filters["severity"])
        if filters.get("zone"): q += " AND zone=?"; p.append(filters["zone"])
        if filters.get("department"): q += " AND department=?"; p.append(filters["department"])
        if filters.get("search"):
            q += " AND (id LIKE ? OR project LIKE ? OR issue_details LIKE ?)"
            s = f"%{filters['search']}%"; p.extend([s,s,s])
        if filters.get("assignedTo"): q += " AND assigned_to=?"; p.append(filters["assignedTo"])
    q += " ORDER BY created_at DESC"
    with get_connection() as c:
        rows = c.execute(q, p).fetchall()
    return [_row_to_complaint(r) for r in rows]

def get_complaint_by_id(cid):
    with get_connection() as c:
        row = c.execute("SELECT * FROM complaints WHERE id=?", (cid,)).fetchone()
    return _row_to_complaint(row) if row else None

def update_complaint(cid, updates):
    field_map = {
        "project":"project","type":"type","severity":"severity","source":"source",
        "raisedOn":"raised_on","zone":"zone","issueDetails":"issue_details",
        "notes":"notes","status":"status","department":"department",
        "assignedTo":"assigned_to","assignedBy":"assigned_by",
        "mailThread":"mail_thread",
        "customerName":"customer_name","customerEmail":"customer_email",
        "validatedBy":"validated_by","validatedAt":"validated_at",
        "slaStarted":"sla_started","rcaDue":"rca_due","closureDue":"closure_due",
        "cbeDate":"cbe_date","cbeStatus":"cbe_status",
        "cbeSubmittedBy":"cbe_submitted_by","cbeApprovedBy":"cbe_approved_by",
        "cbeApprovedAt":"cbe_approved_at",
        "closureStatus":"closure_status",
        "closureMethod":"closure_method",
    }
    json_fields = {"watchers","aiExtracted","actions","rca","capa","customerConfirmation"}
    sets, vals = [], []
    for k, v in updates.items():
        col = field_map.get(k)
        if col:
            sets.append(f"{col}=?"); vals.append(v)
        elif k in json_fields:
            col_name = {"aiExtracted":"ai_extracted","customerConfirmation":"customer_confirmation"}.get(k, k)
            sets.append(f"{col_name}=?"); vals.append(json.dumps(v) if v is not None else None)
    if not sets: return
    vals.append(cid)
    with get_connection() as c:
        c.execute(f"UPDATE complaints SET {','.join(sets)} WHERE id=?", vals)
        c.commit()

def delete_complaint(cid):
    with get_connection() as c:
        c.execute("DELETE FROM complaints WHERE id=?", (cid,)); c.commit()

# ── Email helpers ──
def save_email(from_email, from_name, subject, body, ai_data=None, source="Email", received_at=None):
    eid = str(uuid.uuid4())
    if not received_at:
        import datetime
        received_at = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    with get_connection() as c:
        c.execute("INSERT INTO emails (id,from_email,from_name,subject,body,ai_data,source,received_at) VALUES (?,?,?,?,?,?,?,?)",
            (eid, from_email, from_name or "", subject, body, json.dumps(ai_data or {}), source, received_at))
        c.commit()
    return eid

def get_pending_emails():
    with get_connection() as c:
        rows = c.execute("SELECT * FROM emails WHERE status='pending' ORDER BY received_at DESC").fetchall()
    result = []
    for row in rows:
        d = dict(row)
        d["ai_data"] = _json_loads(d.get("ai_data"))
        if d.get("received_at") and "Z" not in d["received_at"] and "+" not in d["received_at"]:
            d["received_at"] = d["received_at"].replace(" ", "T") + "Z"
        result.append(d)
    return result

def get_all_emails():
    with get_connection() as c:
        rows = c.execute("SELECT * FROM emails ORDER BY received_at DESC").fetchall()
    result = []
    for row in rows:
        d = dict(row)
        d["ai_data"] = _json_loads(d.get("ai_data"))
        if d.get("received_at") and "Z" not in d["received_at"] and "+" not in d["received_at"]:
            d["received_at"] = d["received_at"].replace(" ", "T") + "Z"
        result.append(d)
    return result

def get_email_by_id(eid):
    with get_connection() as c:
        row = c.execute("SELECT * FROM emails WHERE id=?", (eid,)).fetchone()
    if not row: return None
    d = dict(row)
    d["ai_data"] = _json_loads(d.get("ai_data"))
    if d.get("received_at") and "Z" not in d["received_at"] and "+" not in d["received_at"]:
        d["received_at"] = d["received_at"].replace(" ", "T") + "Z"
    return d

def update_email_ai_data(eid, ai_data):
    with get_connection() as c:
        c.execute("UPDATE emails SET ai_data=?, status='extracted' WHERE id=?", (json.dumps(ai_data), eid))
        c.commit()

def update_email_status(eid, status, complaint_id=None):
    with get_connection() as c:
        if complaint_id is None:
            c.execute("UPDATE emails SET status=?, processed_at=CURRENT_TIMESTAMP WHERE id=?", (status, eid))
        else:
            c.execute("UPDATE emails SET status=?, complaint_id=?, processed_at=CURRENT_TIMESTAMP WHERE id=?", (status, complaint_id, eid))
        c.commit()

def mark_email_processed(eid):
    update_email_status(eid, "processed")

def reject_email(eid):
    update_email_status(eid, "rejected")

# ── Notification helpers ──
def create_notification(ntype, complaint_id="", user_id="", title="", message="", severity="Medium"):
    nid = str(uuid.uuid4())
    with get_connection() as c:
        c.execute("INSERT INTO notifications (id,type,complaint_id,user_id,title,message,severity) VALUES (?,?,?,?,?,?,?)",
            (nid, ntype, complaint_id, user_id, title, message, severity))
        c.commit()
    return nid

def get_notifications(user_id=None):
    q = "SELECT * FROM notifications"
    p = []
    if user_id:
        q += " WHERE user_id=? OR user_id=''"
        p.append(user_id)
    q += " ORDER BY created_at DESC LIMIT 50"
    with get_connection() as c:
        rows = c.execute(q, p).fetchall()
    return [Notification(id=r["id"], type=r["type"], complaint_id=r["complaint_id"] or "",
        user_id=r["user_id"] or "", title=r["title"] or "", message=r["message"] or "",
        severity=r["severity"] or "Medium", read=bool(r["read"]),
        created_at=r["created_at"] or "") for r in rows]

def mark_notification_read(nid):
    with get_connection() as c:
        c.execute("UPDATE notifications SET read=1 WHERE id=?", (nid,)); c.commit()

def mark_all_notifications_read(user_id=None):
    with get_connection() as c:
        if user_id:
            c.execute("UPDATE notifications SET read=1 WHERE user_id=? OR user_id=''", (user_id,))
        else:
            c.execute("UPDATE notifications SET read=1")
        c.commit()

# ── Department helpers ──
def get_all_departments():
    with get_connection() as c:
        rows = c.execute("SELECT * FROM departments ORDER BY name").fetchall()
    return [Department(id=r["id"], name=r["name"], head=r["head"] or "",
        escalate_to=r["escalate_to"] or "", issue_types=_json_loads(r["issue_types"],[]),
        created_at=r["created_at"] or "") for r in rows]

def create_department(data):
    did = str(uuid.uuid4())
    with get_connection() as c:
        c.execute("INSERT INTO departments (id,name,head,escalate_to,issue_types) VALUES (?,?,?,?,?)",
            (did, data["name"], data.get("head",""), data.get("escalateTo",""),
             json.dumps(data.get("issueTypes",[]))))
        c.commit()
    return did

def update_department(did, data):
    sets, vals = [], []
    for k,col in [("name","name"),("head","head"),("escalateTo","escalate_to")]:
        if k in data: sets.append(f"{col}=?"); vals.append(data[k])
    if "issueTypes" in data: sets.append("issue_types=?"); vals.append(json.dumps(data["issueTypes"]))
    if not sets: return
    vals.append(did)
    with get_connection() as c:
        c.execute(f"UPDATE departments SET {','.join(sets)} WHERE id=?", vals); c.commit()

# ── Matrix helpers ──
def get_escalation_matrix():
    with get_connection() as c:
        rows = c.execute("SELECT * FROM escalation_matrix ORDER BY id").fetchall()
    return [MatrixRow(id=r["id"], severity=r["severity"], action_start=r["action_start"],
        rca=r["rca"], closure=r["closure"], level1=r["level1"] or "",
        level2=r["level2"] or "", level3=r["level3"] or "") for r in rows]

def update_matrix_row(mid, data):
    sets, vals = [], []
    for k,col in [("actionStart","action_start"),("rca","rca"),("closure","closure"),
                  ("level1","level1"),("level2","level2"),("level3","level3")]:
        if k in data: sets.append(f"{col}=?"); vals.append(data[k])
    if not sets: return
    vals.append(mid)
    with get_connection() as c:
        c.execute(f"UPDATE escalation_matrix SET {','.join(sets)} WHERE id=?", vals); c.commit()

# ── Analytics helpers ──
def get_analytics_data():
    with get_connection() as c:
        total = c.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        rows = c.execute("SELECT severity, COUNT(*) as cnt FROM complaints GROUP BY severity").fetchall()
        sev_dist = [{"name":r["severity"],"value":r["cnt"],
            "fill":{"Fatal":"#DC2626","Critical":"#EA580C","Medium":"#D97706","Low":"#16A34A"}.get(r["severity"],"#94A3B8")} for r in rows]
        dept_rows = c.execute("SELECT department, status, COUNT(*) as cnt FROM complaints WHERE department IS NOT NULL GROUP BY department, status").fetchall()
        dept_map = {}
        for r in dept_rows:
            d = r["department"] or "Other"
            if d not in dept_map: dept_map[d] = {"dept":d,"open":0,"closed":0}
            if r["status"] == "Closed": dept_map[d]["closed"] += r["cnt"]
            else: dept_map[d]["open"] += r["cnt"]
        zone_rows = c.execute("SELECT zone, COUNT(*) as cnt FROM complaints WHERE zone!='' GROUP BY zone").fetchall()
        trend_rows = c.execute("SELECT strftime('%Y-%m',created_at) as month, COUNT(*) as total, SUM(CASE WHEN status='Closed' THEN 1 ELSE 0 END) as closed FROM complaints GROUP BY month ORDER BY month DESC LIMIT 6").fetchall()
        trend = [{"month":r["month"],"total":r["total"],"closed":r["closed"],"breached":0} for r in trend_rows]
        type_rows = c.execute("SELECT type, COUNT(*) as cnt FROM complaints GROUP BY type ORDER BY cnt DESC LIMIT 5").fetchall()
    return {
        "monthlyTrend": list(reversed(trend)) if trend else [{"month":"No Data","total":0,"closed":0,"breached":0}],
        "severityDistribution": sev_dist,
        "departmentWise": list(dept_map.values()),
        "zoneWise": [{"zone":r["zone"],"count":r["cnt"]} for r in zone_rows],
        "avgResolutionDays": [
            {"severity":"Fatal","days":2.8,"target":3},{"severity":"Critical","days":4.2,"target":5},
            {"severity":"Medium","days":6.1,"target":7},{"severity":"Low","days":8.9,"target":10}],
        "repeatIssues": [{"type":r["type"] or "Other","count":r["cnt"]} for r in type_rows],
    }

def get_dashboard_stats():
    with get_connection() as c:
        total = c.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        open_c = c.execute("SELECT COUNT(*) FROM complaints WHERE status!='Closed'").fetchone()[0]
        closed = c.execute("SELECT COUNT(*) FROM complaints WHERE status='Closed'").fetchone()[0]
        pending = c.execute("SELECT COUNT(*) FROM complaints WHERE status='Pending Validation'").fetchone()[0]
    return {"total":total, "open":open_c, "closed":closed, "pendingValidation":pending}

# ── Seed data ──
def seed_data():
    with get_connection() as c:
        if c.execute("SELECT COUNT(*) FROM users").fetchone()[0] > 0:
            return
    log.info("Seeding initial data...")
    pw = generate_password_hash("demo1234")
    users = [
        ("u1","Priya Sharma","priya@godrej.com",pw,"Reviewer","Quality","North","PS"),
        ("u2","Rajesh Kumar","rajesh@godrej.com",pw,"Department User","Legal","South","RK"),
        ("u3","Anita Mehta","anita@godrej.com",pw,"Authority","Operations","East","AM"),
        ("u4","Suresh Patel","suresh@godrej.com",pw,"Authority","Quality","West","SP"),
        ("u5","Neha Singh","neha@godrej.com",pw,"Management","CXO Office","All","NS"),
        ("u6","Vikram Reddy","vikram@godrej.com",pw,"Admin","IT","All","VR"),
        ("u7","Deepa Nair","deepa@godrej.com",pw,"Department User","Engineering","North","DN"),
        ("u8","Kiran Joshi","kiran@godrej.com",pw,"Department User","Customer Relations","South","KJ"),
    ]
    with get_connection() as c:
        c.executemany("INSERT OR IGNORE INTO users (id,name,email,password_hash,role,department,zone,avatar) VALUES (?,?,?,?,?,?,?,?)", users)
        depts = [
            (str(uuid.uuid4()),"Legal","Rajesh Kumar","ZCEO",json.dumps(["Legal","Compliance"])),
            (str(uuid.uuid4()),"Quality","Suresh Patel","ZQH",json.dumps(["Quality","Structural"])),
            (str(uuid.uuid4()),"Operations","Anita Mehta","ZOH",json.dumps(["Maintenance","Safety"])),
            (str(uuid.uuid4()),"Finance","—","CFO",json.dumps(["Financial"])),
            (str(uuid.uuid4()),"Customer Relations","Kiran Joshi","ZCEO",json.dumps(["Documentation","Other"])),
            (str(uuid.uuid4()),"Engineering","Deepa Nair","ZOH",json.dumps(["Structural","Safety"])),
            (str(uuid.uuid4()),"Procurement","—","ZOH",json.dumps([])),
            (str(uuid.uuid4()),"HR","—","CHRO",json.dumps([])),
        ]
        c.executemany("INSERT OR IGNORE INTO departments (id,name,head,escalate_to,issue_types) VALUES (?,?,?,?,?)", depts)
        matrix = [
            ("Fatal",12,24,72,"ZOH","ZCEO","CQO"),
            ("Critical",24,48,120,"ZQH","ZOH","ZCEO"),
            ("Medium",48,72,168,"Site Manager","ZQH","ZOH"),
            ("Low",72,96,240,"CX Team","Site Manager","ZQH"),
        ]
        c.executemany("INSERT OR IGNORE INTO escalation_matrix (severity,action_start,rca,closure,level1,level2,level3) VALUES (?,?,?,?,?,?,?)", matrix)
        c.commit()
    log.info("Seed data inserted.")
