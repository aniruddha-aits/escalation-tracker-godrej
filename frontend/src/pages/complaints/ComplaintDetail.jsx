import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Clock, Tag, User, Building2, Mail,
  MessageSquare, CheckCircle2, AlertCircle, Send, Paperclip, ExternalLink,
  Save,
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { SeverityBadge, StatusBadge, Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { complaintsAPI, closureAPI, adminAPI } from '../../services/api';
import { SEVERITY_CONFIG } from '../../data/mockData';
import { format, formatDistanceToNow } from 'date-fns';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xs font-medium text-slate-700 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

function Timeline({ actions, users }) {
  if (!actions?.length) return <p className="text-xs text-slate-400 py-4">No actions logged yet.</p>;
  return (
    <div className="relative pl-5 space-y-4">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-slate-200" />
      {actions.map((a, i) => {
        const user = users.find(u => u.id === a.by);
        return (
          <div key={i} className="relative">
            <div className="absolute -left-3.5 top-1 w-3 h-3 rounded-full bg-blue-100 border-2 border-blue-400" />
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">{user?.name || 'User'}</span>
                <span className="text-[10px] text-slate-400">{a.at ? formatDistanceToNow(new Date(a.at), { addSuffix: true }) : ''}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{a.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { complaints, updateComplaint, fetchComplaints } = useApp();
  const { currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    adminAPI.getUsers().then(r => { if (r.success) setUsers(r.data); }).catch(() => {});
    // fetch departments from config for the assign dropdown
    import('../../services/api').then(m => m.configAPI.enums()).then(r => {
      if (r.success) setDepartments(r.data.departments || []);
    }).catch(() => {});
  }, []);

  const c = complaints.find(x => x.id === id);

  const [actionText, setActionText]   = useState('');
  const [assignModal, setAssignModal] = useState(false);
  const [closureModal, setClosureModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [cbeDate, setCbeDate]          = useState('');
  const [cbeSaving, setCbeSaving]      = useState(false);

  useEffect(() => {
    setCbeDate(c?.cbeDate ? c.cbeDate.slice(0, 10) : '');
  }, [c?.id, c?.cbeDate]);

  if (!c) return (
    <Layout title="Not Found">
      <div className="text-center py-20 text-slate-400 text-sm">Complaint not found</div>
    </Layout>
  );

  const assignee = users.find(u => u.id === c.assignedTo);
  const validator = users.find(u => u.id === c.validatedBy);
  const rcaDue   = new Date(c.rcaDue);
  const slaBreach = c.status !== 'Closed' && c.rca === null && rcaDue < new Date();
  const isAssignedUser = c.assignedTo === currentUser.id;

  const postAction = async () => {
    if (!actionText.trim()) return;
    await complaintsAPI.addAction(c.id, actionText);
    await fetchComplaints();
    setActionText('');
  };

  const doAssign = async () => {
    await complaintsAPI.assign(c.id, {
      department: selectedDept || c.department,
      assignedTo: selectedUser || c.assignedTo,
      severity: c.severity,
    });
    await fetchComplaints();
    setAssignModal(false);
  };

  const saveCbeDate = async () => {
    setCbeSaving(true);
    try {
      await complaintsAPI.update(c.id, { cbeDate: cbeDate || null });
      await fetchComplaints();
    } finally {
      setCbeSaving(false);
    }
  };

  const doClosure = async (type) => {
    if (type === 'soft') await closureAPI.soft(c.id);
    else await closureAPI.hard(c.id, { note: 'Manually closed by authority.' });
    await fetchComplaints();
    setClosureModal(false);
  };

  const canAssign      = ['Admin', 'Reviewer', 'Authority'].includes(currentUser.role);
  const canAction      = ['Department User', 'Authority', 'Admin'].includes(currentUser.role);
  const canClose       = ['Authority', 'Admin'].includes(currentUser.role);
  const canRca         = ['Department User', 'Authority', 'Admin'].includes(currentUser.role) && c.status === 'Assigned';

  const slaConfig = SEVERITY_CONFIG[c.severity]?.sla;

  return (
    <Layout title={c.id} subtitle={`${c.project} · ${c.type}`}>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to list
        </button>
        <div className="flex items-center gap-2">
          {slaBreach && <Badge color="red">SLA Breached</Badge>}
          {canAssign && c.status === 'Pending Validation' && (
            <Button variant="primary" size="sm" onClick={() => setAssignModal(true)}>Assign & Route</Button>
          )}
          {canAssign && c.status !== 'Pending Validation' && c.status !== 'Closed' && (
            <Button variant="secondary" size="sm" onClick={() => setAssignModal(true)}>Reassign</Button>
          )}
          {canClose && c.status === 'Rectification Done' && (
            <Button variant="success" size="sm" onClick={() => setClosureModal(true)}>Initiate Closure</Button>
          )}
          {canRca && (
            <Button variant="warning" size="sm" onClick={() => navigate('/rca-capa')}>Submit RCA/CAPA</Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${SEVERITY_CONFIG[c.severity]?.dot}`} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <SeverityBadge severity={c.severity} />
                  <StatusBadge status={slaBreach ? 'SLA Breached' : c.status} />
                  <Badge color="slate">{c.source}</Badge>
                  <Badge color="slate">{c.type}</Badge>
                </div>
                <h2 className="text-sm font-semibold text-slate-800 leading-relaxed mb-2">{c.issueDetails}</h2>
                {c.notes && <p className="text-xs text-slate-500 leading-relaxed italic">Note: {c.notes}</p>}
              </div>
            </div>
          </Card>

          {c.aiExtracted && Object.keys(c.aiExtracted).length > 0 && (
            <Card>
              <CardHeader title="AI Extraction Summary" subtitle={`Confidence: ${Math.round((c.aiExtracted.confidence || 0) * 100)}%`} />
              <div className="p-5">
                {c.aiExtracted.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.aiExtracted.keywords.map(k => (
                      <span key={k} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-100">{k}</span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-slate-400">Suggested severity: </span><span className="font-medium">{c.aiExtracted.suggestedSeverity}</span></div>
                  <div><span className="text-slate-400">Suggested dept: </span><span className="font-medium">{c.aiExtracted.suggestedDepartment}</span></div>
                  {validator && <div><span className="text-slate-400">Validated by: </span><span className="font-medium">{validator.name}</span></div>}
                  {c.validatedAt && <div><span className="text-slate-400">Validated: </span><span className="font-medium">{formatDistanceToNow(new Date(c.validatedAt), { addSuffix: true })}</span></div>}
                </div>
              </div>
            </Card>
          )}

          {c.rca && (
            <Card>
              <CardHeader title="Root Cause Analysis (RCA)" />
              <div className="p-5 space-y-4">
                <div><p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Root Cause</p><p className="text-xs text-slate-700 leading-relaxed">{c.rca.rootCause}</p></div>
                <div><p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Chronology</p><pre className="text-xs text-slate-600 font-sans leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{c.rca.chronology}</pre></div>
                {c.rca.aiRephrased?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-purple-500 uppercase tracking-wide mb-2 flex items-center gap-1">✦ AI Structured Summary</p>
                    <ul className="space-y-1.5">{c.rca.aiRephrased.map((l, i) => (<li key={i} className="flex gap-2 text-xs text-slate-600"><span className="text-blue-400 mt-0.5">•</span>{l}</li>))}</ul>
                  </div>
                )}
                {c.rca.approvedBy ? <Badge color="green">Approved by {users.find(u => u.id === c.rca.approvedBy)?.name || 'Authority'}</Badge> : <Badge color="orange">Pending approval</Badge>}
              </div>
            </Card>
          )}

          {c.capa && (
            <Card>
              <CardHeader title="Corrective & Preventive Actions (CAPA)" />
              <div className="p-5 space-y-4">
                <div><p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Corrective Actions</p><p className="text-xs text-slate-700 leading-relaxed">{c.capa.corrective}</p></div>
                <div><p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Preventive Actions</p><p className="text-xs text-slate-700 leading-relaxed">{c.capa.preventive}</p></div>
                {c.capa.aiRephrased?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-purple-500 uppercase tracking-wide mb-2">✦ AI Structured Bullets</p>
                    <ul className="space-y-1.5">{c.capa.aiRephrased.map((l, i) => (<li key={i} className="flex gap-2 text-xs text-slate-600"><span className="text-emerald-400 mt-0.5">•</span>{l}</li>))}</ul>
                  </div>
                )}
                {c.capa.approvedBy ? <Badge color="green">Approved by {users.find(u => u.id === c.capa.approvedBy)?.name || 'Authority'}</Badge> : <Badge color="orange">Pending approval</Badge>}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Activity Log & Actions" />
            <div className="p-5">
              <Timeline actions={c.actions} users={users} />
              {canAction && c.status !== 'Closed' && (
                <div className="mt-5 flex gap-2">
                  <input value={actionText} onChange={e => setActionText(e.target.value)} onKeyDown={e => e.key === 'Enter' && postAction()}
                    placeholder="Add an update, action taken, or note…"
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <Button variant="primary" size="sm" icon={Send} onClick={postAction}>Post</Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <InfoRow icon={Calendar}  label="Raised On"    value={c.raisedOn ? format(new Date(c.raisedOn), 'dd MMM yyyy, HH:mm') : '—'} />
            <InfoRow icon={MapPin}    label="Zone"         value={c.zone} />
            <InfoRow icon={Tag}       label="Source"       value={c.source} />
            <InfoRow icon={Building2} label="Department"   value={c.department} />
            <InfoRow icon={User}      label="Assigned To"  value={assignee?.name} />
            {isAssignedUser && (
              <div className="flex items-start gap-2.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">CBE Date</p>
                  {c.cbeDate && (
                    <p className="text-xs font-medium text-slate-700 mt-0.5 mb-2">
                      {format(new Date(c.cbeDate), 'dd MMM yyyy')}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={cbeDate}
                      onChange={e => setCbeDate(e.target.value)}
                      className="min-w-0 flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button variant="primary" size="sm" icon={Save} onClick={saveCbeDate} disabled={cbeSaving}>
                      {cbeSaving ? 'Saving' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {c.mailThread && (
              <a href={c.mailThread} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> View Mail Thread
              </a>
            )}
          </Card>

          <Card className="p-5">
            <p className="text-xs font-semibold text-slate-700 mb-3">SLA Status</p>
            {slaConfig && (
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Action Start', hours: slaConfig.actionStart },
                  { label: 'RCA Due',      hours: slaConfig.rca },
                  { label: 'Closure Due',  hours: slaConfig.closure },
                ].map(({ label, hours }) => {
                  const due = new Date(new Date(c.slaStarted).getTime() + hours * 3600000);
                  const passed = due < new Date();
                  return (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-medium ${passed ? 'text-red-600' : 'text-emerald-600'}`}>
                        {passed ? 'Overdue' : formatDistanceToNow(due, { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {c.watchers?.length > 0 && (
            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Watchers</p>
              <div className="space-y-2">
                {c.watchers.map(wid => {
                  const w = users.find(u => u.id === wid);
                  if (!w) return null;
                  return (
                    <div key={wid} className="flex items-center gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600">{w.avatar}</div>
                      <span className="text-slate-700">{w.name}</span>
                      <Badge color="slate">{w.role}</Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {c.closureStatus && (
            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Closure Status
              </p>
              <StatusBadge status={c.closureStatus} />
              {c.customerConfirmation && (
                <p className="text-[10px] text-slate-500 mt-2">{c.customerConfirmation.note}</p>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign & Route Complaint" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Department</label>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select department</option>
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Assign To</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select user</option>
              {users.filter(u => !selectedDept || u.department === selectedDept).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400">All watchers and mail thread participants will receive a notification.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={doAssign}>Confirm Assignment</Button>
          </div>
        </div>
      </Modal>

      {/* Closure Modal */}
      <Modal open={closureModal} onClose={() => setClosureModal(false)} title="Initiate Closure" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">Choose closure type for this complaint:</p>
          <div className="space-y-3">
            <button onClick={() => doClosure('soft')}
              className="w-full text-left p-4 rounded-xl border-2 border-sky-200 bg-sky-50 hover:border-sky-400 transition-colors">
              <p className="text-xs font-semibold text-sky-700">Soft Closure</p>
              <p className="text-[10px] text-sky-600 mt-0.5">Rectification done, awaiting customer confirmation</p>
            </button>
            <button onClick={() => doClosure('hard')}
              className="w-full text-left p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-400 transition-colors">
              <p className="text-xs font-semibold text-emerald-700">Hard Closure</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Customer confirmed or no re-escalation received</p>
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
