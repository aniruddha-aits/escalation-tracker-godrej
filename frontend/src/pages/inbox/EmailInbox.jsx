import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, RefreshCw, Sparkles, CheckCircle2, Clock, Send,
  Wifi, AlertCircle, ChevronRight, User, Tag, Building2,
  MapPin, Zap, Eye, ExternalLink, Shield, Inbox,
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { SeverityBadge, Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { emailsAPI, configAPI } from '../../services/api';
import { SEVERITY_CONFIG } from '../../data/mockData';
import { formatDistanceToNow, format } from 'date-fns';

/* ─── AI status config ──────────────────────────────────────── */
const AI_STATUS = {
  pending:   { label: 'Unprocessed',   color: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-400' },
  processing:{ label: 'AI Processing', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500 animate-pulse' },
  extracted: { label: 'AI Extracted',  color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  queued:    { label: 'Sent to Queue', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
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
  const cfg = AI_STATUS[email.aiStatus];
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
function RawEmailView({ email }) {
  return (
    <div className="text-xs">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-2 font-mono">
        <div className="flex gap-3">
          <span className="text-slate-400 w-8 flex-shrink-0">From</span>
          <span className="text-slate-700">{email.fromName} &lt;{email.from}&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-slate-400 w-8 flex-shrink-0">To</span>
          <span className="text-slate-700">{email.to}</span>
        </div>
        {email.cc.length > 0 && (
          <div className="flex gap-3">
            <span className="text-slate-400 w-8 flex-shrink-0">CC</span>
            <span className="text-slate-700">{email.cc.join(', ')}</span>
          </div>
        )}
        <div className="flex gap-3">
          <span className="text-slate-400 w-8 flex-shrink-0">Date</span>
          <span className="text-slate-700">{format(new Date(email.receivedAt), 'EEE, dd MMM yyyy HH:mm')}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-slate-400 w-8 flex-shrink-0">Subj</span>
          <span className="text-slate-800 font-semibold">{email.subject}</span>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
        {email.body}
      </div>
    </div>
  );
}

/* ─── AI extraction panel ───────────────────────────────────── */
function AIExtractionView({ email, onSendToQueue, editState, setEditState, departments }) {
  const ai = email.aiExtracted;
  if (!ai) return null;

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

      {email.aiStatus !== 'queued' && (
        <Button variant="primary" className="w-full justify-center" onClick={onSendToQueue}>
          <Send className="w-4 h-4" /> Send to Validation Queue
        </Button>
      )}

      {email.aiStatus === 'queued' && (
        <div className="flex items-center gap-2 justify-center p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Sent to Validation Queue as {email.queuedAsComplaintId}
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
      <p className="text-xs text-slate-400 mt-1">Fetching new emails from complaints@godrejproperties.com</p>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function EmailInbox() {
  const { addComplaint, fetchComplaints } = useApp();
  const navigate = useNavigate();

  const [emails, setEmails]         = useState([]);
  const [selected, setSelected]     = useState(null);
  const [activeTab, setActiveTab]   = useState('raw');
  const [filterTab, setFilterTab]   = useState('all');
  const [syncing, setSyncing]       = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [lastSynced, setLastSynced] = useState(new Date());
  const [editState, setEditState]   = useState({});
  const [search, setSearch]         = useState('');
  const [departments, setDepartments] = useState([]);

  // Fetch emails from backend on mount
  useEffect(() => {
    configAPI.enums().then(r => {
      if (r.success) {
        setDepartments(r.data.departments || []);
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
          queuedAsComplaintId: null,
        }));
        setEmails(mapped);
      }
    }).catch(() => {});
  }, []);

  // When selected email changes reset editState
  useEffect(() => {
    setEditState({
      customerName:       selected?.aiExtracted?.customerName ?? '',
      suggestedSeverity:  selected?.aiExtracted?.suggestedSeverity ?? selected?.aiExtracted?.priority ?? 'Medium',
      suggestedDepartment: selected?.aiExtracted?.suggestedDepartment ?? selected?.aiExtracted?.department ?? '',
      suggestedZone:      selected?.aiExtracted?.suggestedZone ?? selected?.aiExtracted?.zone ?? '',
      suggestedType:      selected?.aiExtracted?.suggestedType ?? selected?.aiExtracted?.type ?? '',
      project:            selected?.aiExtracted?.project ?? '',
      issueDetails:       selected?.aiExtracted?.issueDetails ?? '',
    });
  }, [selected?.id]);

  const handleSelect = (email) => {
    setSelected(email);
    setActiveTab(email.aiStatus === 'pending' ? 'raw' : 'ai');
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
          queuedAsComplaintId: null,
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
      }
    } catch (err) { console.error('AI process error:', err); }
    setProcessingId(null);
  };

  /* Send to Validation Queue — calls backend API */
  const handleSendToQueue = async () => {
    if (!selected || !selected.aiExtracted) return;
    const ai = selected.aiExtracted;
    try {
      const res = await emailsAPI.sendToQueue(selected.id, {
        project: editState.project || ai.project,
        type: editState.suggestedType || ai.suggestedType,
        severity: editState.suggestedSeverity || ai.suggestedSeverity,
        zone: editState.suggestedZone || ai.suggestedZone,
        department: editState.suggestedDepartment || ai.suggestedDepartment,
        issueDetails: editState.issueDetails || ai.issueDetails,
        customerName: editState.customerName || ai.customerName,
      });
      if (res.success) {
        const compId = res.complaintId;
        setEmails(prev => prev.map(e => e.id === selected.id ? { ...e, aiStatus: 'queued', queuedAsComplaintId: compId } : e));
        setSelected(prev => ({ ...prev, aiStatus: 'queued', queuedAsComplaintId: compId }));
        await fetchComplaints();
      }
    } catch (err) { console.error('Send to queue error:', err); }
  };

  const TABS = [
    { key: 'all',       label: 'All',            count: emails.length },
    { key: 'pending',   label: 'Unprocessed',    count: emails.filter(e => e.aiStatus === 'pending').length },
    { key: 'extracted', label: 'AI Processed',   count: emails.filter(e => e.aiStatus === 'extracted').length },
    { key: 'queued',    label: 'Sent to Queue',  count: emails.filter(e => e.aiStatus === 'queued').length },
  ];

  const filteredEmails = emails.filter(e => filterTab === 'all' || e.aiStatus === filterTab);

  // Keep selected in sync after emails state changes
  const liveSelected = emails.find(e => e.id === selected?.id) ?? selected;

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
      <div className="flex gap-4 h-[calc(100vh-240px)]">

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
                {liveSelected.aiStatus === 'queued' && (
                  <Button variant="secondary" size="sm" icon={ExternalLink}
                    onClick={() => navigate(`/complaints/${liveSelected.queuedAsComplaintId}`)}>
                    View in Queue
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
                      onSendToQueue={handleSendToQueue}
                      editState={editState}
                      setEditState={setEditState}
                      departments={departments}
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
    </Layout>
  );
}
