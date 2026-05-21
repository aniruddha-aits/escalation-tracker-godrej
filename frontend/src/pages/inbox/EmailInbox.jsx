import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, RefreshCw, Sparkles, CheckCircle2, User, Tag, Building2,
  MapPin, Zap, ExternalLink, Inbox, XCircle,
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { emailsAPI, configAPI, adminAPI, complaintsAPI } from '../../services/api';
import { SEVERITY_CONFIG } from '../../data/mockData';
import { formatDistanceToNow, format } from 'date-fns';

/* ─── AI status config ──────────────────────────────────────── */
const AI_STATUS = {
  pending:   { label: 'Unprocessed',   color: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-400' },
  processing:{ label: 'AI Processing', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500 animate-pulse' },
  extracted: { label: 'AI Extracted',  color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  queued:    { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  rejected:  { label: 'Rejected', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

/* ─── Confidence indicator ──────────────────────────────────── */
function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-400' : 'bg-red-400';
  const label = pct >= 90 ? 'text-emerald-700' : pct >= 80 ? 'text-amber-700' : 'text-red-600';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-500 font-medium">AI Confidence</span>
        <span className={`font-bold ${label}`}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Email list item ───────────────────────────────────────── */
function EmailItem({ email, selected, onClick }) {
  const cfg = AI_STATUS[email.aiStatus] || AI_STATUS.pending;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {email.aiStatus === 'pending' && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
          <span className="text-xs font-semibold text-slate-800 truncate">{email.fromName}</span>
        </div>
        <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}</span>
      </div>
      <p className="text-xs text-slate-600 font-medium truncate mb-1.5">{email.subject}</p>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
        <Badge color="slate">{email.source}</Badge>
        {email.aiExtracted && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${SEVERITY_CONFIG[email.aiExtracted.suggestedSeverity]?.color}`}>
            {email.aiExtracted.suggestedSeverity}
          </span>
        )}
      </div>
    </button>
  );
}

/* ─── Raw email panel ───────────────────────────────────────── */
function formatEmailDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'EEE, dd MMM yyyy HH:mm');
}

function parseHeaderLine(line) {
  const match = line.match(/^\s*(from|to|cc|date|sent|subject)\s*:?\s*(.*)$/i);
  if (!match) return null;
  const key = match[1].toLowerCase() === 'sent' ? 'date' : match[1].toLowerCase();
  return { key, value: match[2].trim() };
}

function isSeparatorLine(line) {
  return /^\s*(?:[-_=*]\s*){4,}\s*$/.test(line) || /^\s*-+\s*(original message|forwarded message)\s*-+\s*$/i.test(line);
}

function findNextHeaderLine(lines, start, end) {
  for (let i = start; i < Math.min(lines.length, end); i += 1) {
    const line = lines[i];
    if (!line.trim() || isSeparatorLine(line)) continue;
    const parsed = parseHeaderLine(line);
    return parsed?.key || null;
  }
  return null;
}

function looksLikeTrailHeader(lines, start) {
  const seen = new Set();
  let lastKey = null;
  const end = Math.min(lines.length, start + 16);
  for (let i = start; i < end; i += 1) {
    const line = lines[i];
    if (!line.trim() || isSeparatorLine(line)) continue;
    const parsed = parseHeaderLine(line);
    if (!parsed) {
      if (lastKey && (/^\s+/.test(line) || findNextHeaderLine(lines, i + 1, end))) continue;
      break;
    }
    seen.add(parsed.key);
    lastKey = parsed.key;
  }
  return seen.has('from') && seen.has('to') && seen.has('subject');
}

function readTrailHeader(lines, start) {
  const headers = {};
  let index = start;
  let lastKey = null;
  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || isSeparatorLine(line)) continue;
    const parsed = parseHeaderLine(line);
    if (!parsed) {
      const nextHeader = findNextHeaderLine(lines, index + 1, Math.min(lines.length, start + 16));
      const isWrappedHeaderValue = lastKey && (/^\s+/.test(line) || nextHeader);
      if (isWrappedHeaderValue) {
        headers[lastKey] = `${headers[lastKey] || ''} ${line.trim()}`.trim();
        continue;
      }
      break;
    }
    headers[parsed.key] = parsed.value;
    lastKey = parsed.key;
  }
  while (index < lines.length && (!lines[index].trim() || isSeparatorLine(lines[index]))) {
    index += 1;
  }
  return { headers, bodyStart: index };
}

function cleanMailBody(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && (!lines[start].trim() || isSeparatorLine(lines[start]))) start += 1;
  while (end > start && (!lines[end - 1].trim() || isSeparatorLine(lines[end - 1]))) end -= 1;
  return lines.slice(start, end).join('\n').trim();
}

function getMailTrailSections(email) {
  const lines = (email.body || '').replace(/\r\n/g, '\n').split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i += 1) {
    const parsed = parseHeaderLine(lines[i]);
    if (parsed?.key === 'from' && looksLikeTrailHeader(lines, i)) {
      starts.push(i);
    }
  }

  let trailStarts = starts;
  let currentHeaders = {
    from: `${email.fromName} <${email.from}>`,
    to: email.to,
    cc: (email.cc || []).join(', '),
    date: formatEmailDate(email.receivedAt),
    subject: email.subject,
  };
  let currentBodyLines = starts.length ? lines.slice(0, starts[0]) : lines;

  if (starts.length && cleanMailBody(lines.slice(0, starts[0])) === '') {
    const first = readTrailHeader(lines, starts[0]);
    const nextStart = starts[1] ?? lines.length;
    currentHeaders = {
      ...currentHeaders,
      ...Object.fromEntries(Object.entries(first.headers).filter(([, value]) => value)),
    };
    currentBodyLines = lines.slice(first.bodyStart, nextStart);
    trailStarts = starts.slice(1);
  }

  const sections = [{
    id: 'current',
    current: true,
    headers: currentHeaders,
    body: cleanMailBody(currentBodyLines),
  }];

  trailStarts.forEach((start, idx) => {
    const { headers, bodyStart } = readTrailHeader(lines, start);
    const nextStart = trailStarts[idx + 1] ?? lines.length;
    sections.push({
      id: `trail-${idx}`,
      current: false,
      headers,
      body: cleanMailBody(lines.slice(bodyStart, nextStart)),
    });
  });

  return sections;
}

function MailTrailSection({ section }) {
  const rows = [
    ['From', section.headers.from],
    ['To', section.headers.to],
    ['CC', section.headers.cc],
    ['Date', section.headers.date],
    ['Subject', section.headers.subject],
  ].filter(([, value]) => value);

  return (
    <div className={`overflow-hidden rounded-xl border ${section.current ? 'border-blue-200' : 'border-slate-200'}`}>
      <div className={`${section.current ? 'bg-blue-50' : 'bg-slate-50'} px-4 py-3 border-b ${section.current ? 'border-blue-100' : 'border-slate-200'}`}>
        <div className="space-y-1.5 font-mono">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[4.5rem_1fr] gap-3">
              <span className={`text-[10px] uppercase tracking-wide ${section.current ? 'text-blue-500' : 'text-slate-400'}`}>{label}</span>
              <span className={`text-xs ${label === 'Subject' ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white px-4 py-4 leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
        {section.body || <span className="text-slate-400">-</span>}
      </div>
    </div>
  );
}

function RawEmailView({ email }) {
  const sections = getMailTrailSections(email);
  return (
    <div className="text-xs space-y-4">
      {sections.map(section => <MailTrailSection key={section.id} section={section} />)}
    </div>
  );
}

/* ─── AI extraction panel ───────────────────────────────────── */
function AIExtractionView({ email, onApprove, onReject, onAssignRoute, editState, setEditState, departments, decisionAction }) {
  const ai = email.aiExtracted;
  if (!ai) return null;
  const isApproved = email.aiStatus === 'queued';
  const isRejected = email.aiStatus === 'rejected';
  const decisionPending = decisionAction?.id === email.id;

  return (
    <div className="space-y-4">
      <ConfidenceBar value={ai.confidence} />

      {/* Urgency signals */}
      {(ai.urgencySignals || []).length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Urgency Signals Detected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(ai.urgencySignals || []).map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full border border-red-200">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      <div>
        <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AI Extracted Keywords
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(ai.keywords || []).map(k => (
            <span key={k} className="text-xs px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-100">{k}</span>
          ))}
        </div>
      </div>

      {/* Extracted fields — editable */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Structured Data Extracted by AI</p>
          <span className="text-[10px] text-slate-400">Override if needed before routing</span>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {[
            { icon: User,      label: 'Customer',   key: 'customerName',        type: 'text' },
            { icon: Tag,       label: 'Severity',   key: 'suggestedSeverity',   type: 'select', opts: ['Fatal','Critical','Medium','Low'] },
            { icon: Building2, label: 'Department', key: 'suggestedDepartment', type: 'select', opts: departments },
            { icon: MapPin,    label: 'Zone',       key: 'suggestedZone',       type: 'text' },
            { icon: Tag,       label: 'Type',       key: 'suggestedType',       type: 'select', opts: ['Structural','Quality','Legal','Safety','Documentation','Maintenance','Financial','Other'] },
            { icon: Building2, label: 'Project Name', key: 'project', type: 'text' },
          ].map(({ icon: Icon, label, key, type, opts }) => {
            const val = key === 'project' ? editState.project : (editState[key] ?? ai[key]);
            return (
              <div key={key}>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Icon className="w-3 h-3" />{label}
                </p>
                {type === 'select' ? (
                  <select
                    value={val || ''}
                    onChange={e => setEditState(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={val || ''}
                    onChange={e => setEditState(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="px-4 pb-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Issue Summary (AI)</p>
          <textarea
            rows={3}
            value={editState.issueDetails ?? ai.issueDetails}
            onChange={e => setEditState(p => ({ ...p, issueDetails: e.target.value }))}
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
            style={{height: "150px"}}
          />
        </div>
      </div>

      {/* Sentiment */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-500">Sentiment:</span>
        <span className={`font-semibold ${ai.sentiment?.includes('Extremely') ? 'text-red-600' : ai.sentiment?.includes('Highly') ? 'text-orange-600' : 'text-amber-600'}`}>
          {ai.sentiment}
        </span>
      </div>

      {/* SLA preview */}
      {editState.suggestedSeverity && SEVERITY_CONFIG[editState.suggestedSeverity] && (
        <div className={`rounded-xl p-3 text-xs border ${SEVERITY_CONFIG[editState.suggestedSeverity].color}`}>
          <span className="font-semibold">SLA for {editState.suggestedSeverity}: </span>
          Action in {SEVERITY_CONFIG[editState.suggestedSeverity].sla.actionStart}h ·
          RCA in {SEVERITY_CONFIG[editState.suggestedSeverity].sla.rca}h ·
          Closure in {SEVERITY_CONFIG[editState.suggestedSeverity].sla.closure}h
        </div>
      )}

      {!isApproved && !isRejected && (
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={onAssignRoute}
            disabled={decisionPending}
          >
            <User className="w-4 h-4" />
            Assign & Route Complaint
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="danger"
              className="justify-center"
              onClick={onReject}
              disabled={decisionPending}
            >
              <XCircle className="w-4 h-4" />
              {decisionAction?.type === 'reject' && decisionAction?.id === email.id ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              variant="success"
              className="justify-center"
              onClick={onApprove}
              disabled={decisionPending}
            >
              <CheckCircle2 className="w-4 h-4" />
              {decisionAction?.type === 'approve' && decisionAction?.id === email.id ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 justify-center p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Approved{email.queuedAsComplaintId ? ` as ${email.queuedAsComplaintId}` : ''}
          </div>
          {email.queuedAsComplaintId && (
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={onAssignRoute}
              disabled={decisionPending}
            >
              <User className="w-4 h-4" />
              Assign & Route Complaint
            </Button>
          )}
        </div>
      )}

      {isRejected && (
        <div className="flex items-center gap-2 justify-center p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
          <XCircle className="w-4 h-4" />
          Rejected
        </div>
      )}
    </div>
  );
}

/* ─── Sync animation overlay ───────────────────────────────── */
function SyncingOverlay() {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-xl">
      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-semibold text-slate-700">Connecting to inbox…</p>
      <p className="text-xs text-slate-400 mt-1" style={{textAlign: "center"}}>Fetching new emails from complaints@godrejproperties.com</p>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
function getEditState(email) {
  const ai = email?.aiExtracted || {};
  return {
    customerName:        ai.customerName ?? '',
    customerEmail:       ai.customerEmail ?? '',
    suggestedSeverity:   ai.suggestedSeverity ?? ai.priority ?? 'Medium',
    suggestedDepartment: ai.suggestedDepartment ?? ai.department ?? '',
    suggestedZone:       ai.suggestedZone ?? ai.zone ?? '',
    suggestedType:       ai.suggestedType ?? ai.type ?? '',
    project:             ai.project ?? '',
    issueDetails:        ai.issueDetails ?? '',
    assignedTo:          email?.assignedTo ?? '',
  };
}

export default function EmailInbox() {
  const { fetchComplaints } = useApp();
  const navigate = useNavigate();

  const [emails, setEmails]         = useState([]);
  const [selected, setSelected]     = useState(null);
  const [activeTab, setActiveTab]   = useState('raw');
  const [filterTab, setFilterTab]   = useState('all');
  const [syncing, setSyncing]       = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [decisionAction, setDecisionAction] = useState(null);
  const [lastSynced, setLastSynced] = useState(new Date());
  const [editState, setEditState]   = useState({});
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  // Fetch emails from backend on mount
  useEffect(() => {
    configAPI.enums().then(r => {
      if (r.success) {
        setDepartments(r.data.departments || []);
      }
    }).catch(() => {});
    adminAPI.getUsers().then(r => {
      if (r.success) {
        setUsers(r.data || []);
      }
    }).catch(() => {});
    emailsAPI.getAll().then(res => {
      if (res.success) {
        const mapped = (res.data || []).map(e => ({
          id: e.id, from: e.from_email, fromName: e.from_name || e.from_email,
          to: 'complaints@godrejproperties.com', cc: [],
          subject: e.subject, body: e.body || '', receivedAt: e.received_at,
          source: e.source || 'Email', aiStatus: e.status || 'pending',
          aiExtracted: e.ai_data && Object.keys(e.ai_data).length > 0 ? e.ai_data : null,
          queuedAsComplaintId: e.complaint_id || null,
        }));
        setEmails(mapped);
      }
    }).catch(() => {});
  }, []);

  const handleSelect = (email) => {
    setSelected(email);
    setEditState(getEditState(email));
    setActiveTab(email.aiStatus === 'pending' || !email.aiExtracted ? 'raw' : 'ai');
  };

  /* Sync Now — calls backend to fetch new emails from IMAP */
  const handleSync = async () => {
    setSyncing(true);
    try {
      await emailsAPI.sync();
      const res = await emailsAPI.getAll();
      if (res.success) {
        const mapped = (res.data || []).map(e => ({
          id: e.id, from: e.from_email, fromName: e.from_name || e.from_email,
          to: 'complaints@godrejproperties.com', cc: [],
          subject: e.subject, body: e.body || '', receivedAt: e.received_at,
          source: e.source || 'Email', aiStatus: e.status || 'pending',
          aiExtracted: e.ai_data && Object.keys(e.ai_data).length > 0 ? e.ai_data : null,
          queuedAsComplaintId: e.complaint_id || null,
        }));
        setEmails(mapped);
      }
      setLastSynced(new Date());
    } catch (err) { console.error('Sync error:', err); }
    setSyncing(false);
  };

  /* AI Process a single pending email — calls backend */
  const handleProcessAI = async (emailId) => {
    setProcessingId(emailId);
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, aiStatus: 'processing' } : e));
    try {
      const res = await emailsAPI.processAI(emailId);
      if (res.success) {
        const ai = res.data;
        const extracted = {
          customerName: ai.customerName || '',
          customerEmail: ai.customerEmail || '',
          project: ai.project || 'Unknown',
          issueDetails: ai.issueDetails || '',
          keywords: ai.keywords || [],
          suggestedSeverity: ai.priority || 'Medium',
          suggestedDepartment: ai.department || 'Operations',
          suggestedZone: ai.zone || 'Unknown',
          suggestedType: ai.type || 'Other',
          confidence: ai.confidence || 0.8,
          sentiment: ai.sentiment || 'Negative',
          urgencySignals: (ai.keywords || []).slice(0, 2),
        };
        setEmails(prev => prev.map(e => e.id === emailId ? { ...e, aiStatus: 'extracted', aiExtracted: extracted } : e));
        setSelected(prev => prev?.id === emailId ? { ...prev, aiStatus: 'extracted', aiExtracted: extracted } : prev);
        if (selected?.id === emailId) {
          setEditState({
            customerName: extracted.customerName,
            customerEmail: extracted.customerEmail,
            suggestedSeverity: extracted.suggestedSeverity,
            suggestedDepartment: extracted.suggestedDepartment,
            suggestedZone: extracted.suggestedZone,
            suggestedType: extracted.suggestedType,
            project: extracted.project,
            issueDetails: extracted.issueDetails,
            assignedTo: '',
          });
        }
      }
    } catch (err) { console.error('AI process error:', err); }
    setProcessingId(null);
  };

  const getRouteDefaults = () => {
    const ai = selected?.aiExtracted || {};
    return {
      department: editState.suggestedDepartment || ai.suggestedDepartment || ai.department || '',
      severity: editState.suggestedSeverity || ai.suggestedSeverity || ai.priority || 'Medium',
    };
  };

  const promoteEmailToComplaint = async (route = {}) => {
    if (!selected || !selected.aiExtracted) return;
    const ai = selected.aiExtracted;
    const res = await emailsAPI.sendToQueue(selected.id, {
      project: editState.project || ai.project,
      type: editState.suggestedType || ai.suggestedType,
      severity: route.severity || editState.suggestedSeverity || ai.suggestedSeverity,
      zone: editState.suggestedZone || ai.suggestedZone,
      department: route.department || editState.suggestedDepartment || ai.suggestedDepartment,
      issueDetails: editState.issueDetails || ai.issueDetails,
      customerName: editState.customerName || ai.customerName,
    });
    if (!res.success) return null;
    const compId = res.complaintId;
    setEmails(prev => prev.map(e => e.id === selected.id ? { ...e, aiStatus: 'queued', queuedAsComplaintId: compId } : e));
    setSelected(prev => prev ? { ...prev, aiStatus: 'queued', queuedAsComplaintId: compId } : prev);
    return compId;
  };

  const handleApproveEmail = async () => {
    if (!selected || !selected.aiExtracted) return;
    setDecisionAction({ id: selected.id, type: 'approve' });
    try {
      await promoteEmailToComplaint();
      await fetchComplaints();
    } catch (err) { console.error('Approve email error:', err); }
    finally { setDecisionAction(null); }
  };

  const openAssignRouteModal = () => {
    const defaults = getRouteDefaults();
    setSelectedDept(defaults.department);
    setSelectedUser(editState.assignedTo || '');
    setAssignModal(true);
  };

  const handleAssignRoute = async () => {
    if (!selected || !selected.aiExtracted || !selectedUser) return;
    const defaults = getRouteDefaults();
    const department = selectedDept || defaults.department;
    const severity = defaults.severity;
    setDecisionAction({ id: selected.id, type: 'assign' });
    try {
      let complaintId = selected.queuedAsComplaintId;
      if (selected.aiStatus !== 'queued' || !complaintId) {
        complaintId = await promoteEmailToComplaint({ department, severity });
      }
      if (!complaintId) return;
      await complaintsAPI.assign(complaintId, { department, assignedTo: selectedUser, severity });
      setEmails(prev => prev.map(e => e.id === selected.id ? { ...e, aiStatus: 'queued', queuedAsComplaintId: complaintId, assignedTo: selectedUser } : e));
      setSelected(prev => prev ? { ...prev, aiStatus: 'queued', queuedAsComplaintId: complaintId, assignedTo: selectedUser } : prev);
      setEditState(prev => ({ ...prev, assignedTo: selectedUser, suggestedDepartment: department }));
      await fetchComplaints();
      setAssignModal(false);
    } catch (err) { console.error('Assign route error:', err); }
    finally { setDecisionAction(null); }
  };

  const handleRejectEmail = async () => {
    if (!selected) return;
    setDecisionAction({ id: selected.id, type: 'reject' });
    try {
      const res = await emailsAPI.reject(selected.id);
      if (res.success) {
        setEmails(prev => prev.map(e => e.id === selected.id ? { ...e, aiStatus: 'rejected' } : e));
        setSelected(prev => prev ? { ...prev, aiStatus: 'rejected' } : prev);
      }
    } catch (err) { console.error('Reject email error:', err); }
    finally { setDecisionAction(null); }
  };

  const TABS = [
    { key: 'all',       label: 'All',            count: emails.length },
    { key: 'pending',   label: 'Unprocessed',    count: emails.filter(e => e.aiStatus === 'pending').length },
    { key: 'extracted', label: 'AI Processed',   count: emails.filter(e => e.aiStatus === 'extracted').length },
    { key: 'queued',    label: 'Approved',       count: emails.filter(e => e.aiStatus === 'queued').length },
    { key: 'rejected',  label: 'Rejected',       count: emails.filter(e => e.aiStatus === 'rejected').length },
  ];

  const filteredEmails = emails.filter(e => filterTab === 'all' || e.aiStatus === filterTab);

  // Keep selected in sync after emails state changes
  const liveSelected = emails.find(e => e.id === selected?.id) ?? selected;
  const assignableUsers = users.filter(u => (
    u.is_active !== false && (!selectedDept || u.department === selectedDept)
  ));

  return (
    <Layout title="Email Inbox" subtitle="AI-powered complaint detection from connected mail inbox">
      {/* ── Inbox config bar ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Inbox className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">complaints@godrejproperties.com</p>
                <p className="text-[10px] text-slate-400">IMAP Server</p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700 font-semibold">Connected</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <RefreshCw className="w-3 h-3" />
              Auto-sync every 30 min
            </div>
            <div className="text-[10px] text-slate-400">
              Last synced: {formatDistanceToNow(lastSynced, { addSuffix: true })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right text-[10px] text-slate-500 mr-1">
              <span className="font-bold text-slate-800">{emails.filter(e => e.aiStatus === 'pending').length}</span> unprocessed
            </div>
            <Button
              variant="primary" size="sm"
              icon={syncing ? undefined : RefreshCw}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Syncing…
                </span>
              ) : 'Sync Now'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Split panel ── */}
      <div className="flex gap-4 h-[calc(100vh-200px)]">

        {/* LEFT — email list */}
        <div className="w-80 flex-shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden relative">
          {syncing && <SyncingOverlay />}

          {/* Filter tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setFilterTab(t.key)}
                className={`flex-1 py-2.5 text-[10px] font-semibold transition-colors ${filterTab === t.key ? 'text-blue-700 border-b-2 border-blue-500 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.label}
                {t.count > 0 && <span className="ml-1 text-[9px] px-1 py-0.5 rounded-full bg-slate-200 text-slate-600">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Email items */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filteredEmails.length === 0 && (
              <div className="text-center py-12 text-xs text-slate-400">No emails in this category</div>
            )}
            {filteredEmails.map(email => (
              <EmailItem
                key={email.id}
                email={email}
                selected={liveSelected?.id === email.id}
                onClick={() => handleSelect(email)}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — email detail */}
        {liveSelected ? (
          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            {/* Email header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-slate-800 leading-tight mb-1">{liveSelected.subject}</h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>From: <span className="text-slate-700 font-medium">{liveSelected.fromName}</span> &lt;{liveSelected.from}&gt;</span>
                  {liveSelected.cc.length > 0 && (
                    <span className="text-[10px] text-slate-400">CC: {liveSelected.cc.join(', ')}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge color="slate">{liveSelected.source}</Badge>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${AI_STATUS[liveSelected.aiStatus]?.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${AI_STATUS[liveSelected.aiStatus]?.dot}`} />
                    {AI_STATUS[liveSelected.aiStatus]?.label}
                  </span>
                  <span className="text-[10px] text-slate-400">{format(new Date(liveSelected.receivedAt), 'dd MMM yyyy, HH:mm')}</span>
                </div>
              </div>

              {/* Action button */}
              <div className="ml-4 flex-shrink-0">
                {['pending', 'extracted'].includes(liveSelected.aiStatus) && (
                  <Button variant="primary" size="sm" icon={Sparkles}
                    onClick={() => handleProcessAI(liveSelected.id)}
                    disabled={processingId === liveSelected.id}
                  >
                    {processingId === liveSelected.id ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        AI Processing…
                      </span>
                    ) : liveSelected.aiStatus === 'extracted' ? 'Re-run AI Analysis' : 'Process with AI'}
                  </Button>
                )}
                {liveSelected.aiStatus === 'queued' && liveSelected.queuedAsComplaintId && (
                  <Button variant="secondary" size="sm" icon={ExternalLink}
                    onClick={() => navigate(`/complaints/${liveSelected.queuedAsComplaintId}`)}>
                    View Approved
                  </Button>
                )}
              </div>
            </div>

            {/* AI Processing animation */}
            {liveSelected.aiStatus === 'processing' && (
              <div className="flex flex-col items-center gap-4 py-16">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                  <Sparkles className="w-6 h-6 text-purple-600 absolute inset-0 m-auto" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">AI Analysing Email…</p>
                  <p className="text-xs text-slate-400 mt-1">Extracting keywords · Detecting severity · Mapping department</p>
                </div>
                <div className="w-64 space-y-2 mt-2">
                  {['Reading email content…', 'Detecting urgency signals…', 'Classifying severity…', 'Mapping to department…'].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin flex-shrink-0"
                        style={{ animationDelay: `${i * 0.3}s` }} />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs + content */}
            {liveSelected.aiStatus !== 'processing' && (
              <>
                <div className="flex border-b border-slate-200 px-5 pt-3">
                  {[
                    { key: 'raw', label: 'Raw Email', icon: Mail },
                    { key: 'ai',  label: 'AI Analysis', icon: Sparkles, disabled: !liveSelected.aiExtracted },
                  ].map(t => (
                    <button key={t.key}
                      onClick={() => !t.disabled && setActiveTab(t.key)}
                      disabled={t.disabled}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors mr-1 ${activeTab === t.key ? 'border-blue-500 text-blue-700' : t.disabled ? 'border-transparent text-slate-300 cursor-not-allowed' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      <t.icon className="w-3.5 h-3.5" />
                      {t.label}
                      {t.key === 'ai' && liveSelected.aiStatus === 'extracted' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                  {activeTab === 'raw' && <RawEmailView email={liveSelected} />}
                  {activeTab === 'ai' && liveSelected.aiExtracted && (
                    <AIExtractionView
                      email={liveSelected}
                      onApprove={handleApproveEmail}
                      onReject={handleRejectEmail}
                      onAssignRoute={openAssignRouteModal}
                      editState={editState}
                      setEditState={setEditState}
                      departments={departments}
                      decisionAction={decisionAction}
                    />
                  )}
                  {activeTab === 'ai' && !liveSelected.aiExtracted && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Sparkles className="w-8 h-8 text-slate-200 mb-3" />
                      <p className="text-sm font-medium text-slate-500">Email not yet processed</p>
                      <p className="text-xs text-slate-400 mt-1">Click "Process with AI" to extract structured data</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Mail className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              <p className="text-sm">Select an email to view</p>
            </div>
          </div>
        )}
      </div>

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign & Route Complaint" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Department</label>
            <select
              value={selectedDept}
              onChange={e => {
                const dept = e.target.value;
                setSelectedDept(dept);
                const assignee = users.find(u => u.id === selectedUser);
                if (assignee?.department && assignee.department !== dept) {
                  setSelectedUser('');
                }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select department</option>
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Assign To</label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select user</option>
              {assignableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAssignRoute} disabled={!selectedUser || decisionAction?.type === 'assign'}>
              {decisionAction?.type === 'assign' ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
