import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Edit3, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { SeverityBadge, Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { complaintsAPI, configAPI } from '../../services/api';
import { SEVERITY_CONFIG } from '../../data/mockData';
import { formatDistanceToNow } from 'date-fns';

function ValidationCard({ complaint, onApprove, onReject, projects, zones, departments }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [severity, setSeverity] = useState(complaint.aiExtracted?.suggestedSeverity || complaint.severity);
  const [dept, setDept] = useState(complaint.aiExtracted?.suggestedDepartment || complaint.department || '');
  const [project, setProject] = useState(complaint.project);
  const [zone, setZone] = useState(complaint.zone);
  const [notes, setNotes] = useState(complaint.notes || '');

  const confidence = complaint.aiExtracted?.confidence || 0;
  const confColor = confidence >= 0.9 ? 'text-emerald-600' : confidence >= 0.8 ? 'text-amber-600' : 'text-red-600';

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[severity]?.dot}`} />
          <span className="text-xs font-bold text-slate-700 font-mono">{complaint.id}</span>
          <SeverityBadge severity={severity} />
          <Badge color="purple">{complaint.source}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${confColor}`}>AI {Math.round(confidence * 100)}%</span>
          <span className="text-[10px] text-slate-400">{complaint.raisedOn ? formatDistanceToNow(new Date(complaint.raisedOn), { addSuffix: true }) : ''}</span>
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{complaint.issueDetails}</p>
        {complaint.aiExtracted?.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-[10px] text-slate-400 mr-1 self-center">AI keywords:</span>
            {complaint.aiExtracted.keywords.map(k => (
              <span key={k} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] rounded-full border border-purple-100">{k}</span>
            ))}
          </div>
        )}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-700">AI Extracted Fields</p>
              <button onClick={() => setEditing(e => !e)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Edit3 className="w-3 h-3" />{editing ? 'Done' : 'Edit'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Severity', val: severity, set: setSeverity, opts: ['Fatal','Critical','Medium','Low'] },
                { label: 'Department', val: dept, set: setDept, opts: ['', ...departments] },
                { label: 'Project', val: project, set: setProject, opts: projects },
                { label: 'Zone', val: zone, set: setZone, opts: zones },
              ].map(({ label, val, set, opts }) => (
                <div key={label}>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                  {editing ? (
                    <select value={val} onChange={e => set(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <p className="text-xs font-medium text-slate-700">{val || '—'}</p>
                  )}
                </div>
              ))}
            </div>
            {editing && (
              <div className="mt-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-xl">
        <Button variant="ghost" size="sm" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Collapse' : 'Expand & Edit'}
        </Button>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" icon={XCircle} onClick={() => onReject(complaint.id)}>Reject</Button>
          <Button variant="success" size="sm" icon={CheckCircle} onClick={() => onApprove(complaint.id, { severity, department: dept, project, zone, notes })}>Approve & Route</Button>
        </div>
      </div>
    </Card>
  );
}

export default function ValidationQueue() {
  const { complaints, fetchComplaints } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [zones, setZones] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    configAPI.enums().then(r => {
      if (r.success) { setProjects(r.data.projects||[]); setZones(r.data.zones||[]); setDepartments(r.data.departments||[]); }
    }).catch(() => {});
  }, []);

  const queue = complaints.filter(c => c.status === 'Pending Validation');
  const recentlyValidated = complaints.filter(c => c.validatedBy === currentUser.id).slice(0, 3);

  const approve = async (id, updates) => {
    await complaintsAPI.validate(id, updates);
    await fetchComplaints();
  };

  const reject = async (id) => {
    await complaintsAPI.reject(id);
    await fetchComplaints();
  };

  return (
    <Layout title="Validation Queue" subtitle="Review AI-extracted data before routing to departments">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-700">Pending Review</h2>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{queue.length}</span>
            </div>
          </div>
          {queue.length === 0 ? (
            <Card className="py-2"><EmptyState icon={CheckCircle} title="Queue is clear" subtitle="All complaints have been validated" /></Card>
          ) : (
            queue.map(c => <ValidationCard key={c.id} complaint={c} onApprove={approve} onReject={reject} projects={projects} zones={zones} departments={departments} />)
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Queue Summary" />
            <div className="p-5 space-y-3">
              {['Fatal','Critical','Medium','Low'].map(sev => {
                const count = queue.filter(c => c.aiExtracted?.suggestedSeverity === sev).length;
                return (
                  <div key={sev} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[sev].dot}`} />
                      <span className="text-xs text-slate-600">{sev}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{count}</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                {queue.filter(c => c.aiExtracted?.confidence >= 0.9).length} high-confidence · {queue.filter(c => c.aiExtracted?.confidence < 0.8).length} need manual review
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Validation Guide" />
            <div className="p-5 space-y-3 text-xs text-slate-600">
              {[{c:'emerald',t:'Verify AI-extracted project, severity, and department.'},{c:'blue',t:'Correct any misclassified fields before routing.'},{c:'purple',t:'Approved complaints trigger automatic notifications to assigned department.'},{c:'red',t:'Rejected complaints return to New status for re-intake.'}].map(({c,t})=>(
                <div key={t} className="flex gap-2"><span className={`text-${c}-500 mt-0.5`}>●</span><p>{t}</p></div>
              ))}
            </div>
          </Card>
          {recentlyValidated.length > 0 && (
            <Card>
              <CardHeader title="Recently Validated" />
              <div className="divide-y divide-slate-50">
                {recentlyValidated.map(c => (
                  <button key={c.id} onClick={() => navigate(`/complaints/${c.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
                    <div className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[c.severity]?.dot} flex-shrink-0`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{c.id}</p>
                      <p className="text-[10px] text-slate-500 truncate">{c.project}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
