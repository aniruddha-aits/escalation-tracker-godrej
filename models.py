"""
models.py
---------
Dataclasses representing all domain entities.
Each has a to_dict() for JSON serialisation.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class User:
    id: str
    name: str
    email: str
    password_hash: str
    role: str            # Admin, Management, Authority, Department User, Reviewer
    department: str = ""
    zone: str = "All"
    avatar: str = ""
    is_active: bool = True
    created_at: str = ""

    def to_dict(self, include_hash=False):
        d = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "department": self.department,
            "zone": self.zone,
            "avatar": self.avatar,
            "is_active": self.is_active,
            "created_at": self.created_at,
        }
        if include_hash:
            d["password_hash"] = self.password_hash
        return d


@dataclass
class Complaint:
    id: str
    project: str = ""
    type: str = ""
    severity: str = "Medium"
    source: str = "Email"
    raisedOn: str = ""
    zone: str = ""
    issueDetails: str = ""
    notes: str = ""
    status: str = "Pending Validation"
    department: Optional[str] = None
    assignedTo: Optional[str] = None
    assignedBy: Optional[str] = None
    watchers: list = field(default_factory=list)
    mailThread: Optional[str] = None
    customerName: str = ""
    customerEmail: str = ""
    aiExtracted: Optional[dict] = None
    validatedBy: Optional[str] = None
    validatedAt: Optional[str] = None
    slaStarted: Optional[str] = None
    rcaDue: Optional[str] = None
    closureDue: Optional[str] = None
    actions: list = field(default_factory=list)
    cbeDate: Optional[str] = None
    cbeStatus: Optional[str] = None
    cbeSubmittedBy: Optional[str] = None
    cbeApprovedBy: Optional[str] = None
    cbeApprovedAt: Optional[str] = None
    rca: Optional[dict] = None
    capa: Optional[dict] = None
    closureStatus: Optional[str] = None
    customerConfirmation: Optional[dict] = None
    closureMethod: Optional[str] = None
    created_at: str = ""

    def to_dict(self):
        return {
            "id": self.id,
            "project": self.project,
            "type": self.type,
            "severity": self.severity,
            "source": self.source,
            "raisedOn": self.raisedOn,
            "zone": self.zone,
            "issueDetails": self.issueDetails,
            "notes": self.notes,
            "status": self.status,
            "department": self.department,
            "assignedTo": self.assignedTo,
            "assignedBy": self.assignedBy,
            "watchers": self.watchers,
            "mailThread": self.mailThread,
            "customerName": self.customerName,
            "customerEmail": self.customerEmail,
            "aiExtracted": self.aiExtracted,
            "validatedBy": self.validatedBy,
            "validatedAt": self.validatedAt,
            "slaStarted": self.slaStarted,
            "rcaDue": self.rcaDue,
            "closureDue": self.closureDue,
            "actions": self.actions,
            "cbeDate": self.cbeDate,
            "cbeStatus": self.cbeStatus,
            "cbeSubmittedBy": self.cbeSubmittedBy,
            "cbeApprovedBy": self.cbeApprovedBy,
            "cbeApprovedAt": self.cbeApprovedAt,
            "rca": self.rca,
            "capa": self.capa,
            "closureStatus": self.closureStatus,
            "customerConfirmation": self.customerConfirmation,
            "closureMethod": self.closureMethod,
            "created_at": self.created_at,
        }


@dataclass
class Notification:
    id: str
    type: str          # SLA_BREACH, ASSIGNMENT, RCA_SUBMITTED, VALIDATION, SLA_WARNING, CLOSURE
    complaint_id: str = ""
    user_id: str = ""
    title: str = ""
    message: str = ""
    severity: str = "Medium"
    read: bool = False
    created_at: str = ""

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "complaintId": self.complaint_id,
            "userId": self.user_id,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "read": self.read,
            "createdAt": self.created_at,
        }


@dataclass
class Department:
    id: str
    name: str
    head: str = ""
    escalate_to: str = ""
    issue_types: list = field(default_factory=list)
    created_at: str = ""

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "head": self.head,
            "escalateTo": self.escalate_to,
            "issueTypes": self.issue_types,
            "created_at": self.created_at,
        }


@dataclass
class MatrixRow:
    id: int
    severity: str
    action_start: int = 72
    rca: int = 96
    closure: int = 240
    level1: str = ""
    level2: str = ""
    level3: str = ""

    def to_dict(self):
        return {
            "id": self.id,
            "severity": self.severity,
            "actionStart": self.action_start,
            "rca": self.rca,
            "closure": self.closure,
            "level1": self.level1,
            "level2": self.level2,
            "level3": self.level3,
        }
