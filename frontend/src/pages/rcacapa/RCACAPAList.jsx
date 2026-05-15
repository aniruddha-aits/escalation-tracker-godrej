import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitMerge, CheckCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { SeverityBadge, StatusBadge, Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { rcaAPI, adminAPI } from '../../services/api';
import { SEVERITY_CONFIG } from '../../data/mockData';
import { formatDistanceToNow } from 'date-fns';

function RcaSubmitModal({ complaint, onClose, onSubmit }) {
  const [rootCause, setRootCause]   = useState('');
  const [chronology, setChronology] = useState('');
  const [corrective, setCorrective] = useState('');
  const [preventive, setPreventive] = useState('');
  const [aiRunning, setAiRunning]   = useState(false);
  const [aiDone, setAiDone]         = useState(false);
  const [aiRca, setAiRca]           = useState([]);
  const [aiCapa, setAiCapa]         = useState([]);

  const runAi = async () => {
    if (!rootCause || !corrective) return;
    setAiRunning(true);
    try {
      const res = await rcaAPI.aiRephrase(complaint.id, { rootCause, chronology, corrective, preventive });
      if (res.success) {
        setAiRca(res.data.rcaBullets || []);
        setAiCapa(res.data.capaBullets || []);
        setAiDone(true);
      }
    } catch {
      setAiRca([`Root cause: ${rootCause.slice(0, 80)}…`]);
      setAiCapa([`Corrective: ${corrective.slice(0, 80)}…`]);
      setAiDone(true);
    }
    setAiRunning(false);
  };

  const handleSubmit = () => {
    onSubmit({ rootCause, chronology, corrective, preventive, aiRephrased: aiRca, capaAiRephrased: aiCapa });
    onClose();
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";

  return (
    <div className="space-y-5">
      <div className={`text-xs px-3 py-2 rounded-lg border ${SEVERITY_CONFIG[complaint.severity]?.color}`}>
        <span className="font-semibold">{complaint.id}</span> · {complaint.project} · {complaint.severity}
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">Root Cause <span className="text-red-500">*</span></label>
        <textarea rows={3} value={rootCause} onChange={e => setRootCause(e.target.value)} placeholder="Identify the underlying root cause…" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">Chronological Order of Occurrence</label>
        <textarea rows={4} value={chronology} onChange={e => setChronology(e.target.value)} placeholder="Day 1: …&#10;Day 2: …&#10;Day 3: …" className={inputCls} />
      </div>
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-700 mb-3">CAPA</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Corrective Actions <span className="text-red-500">*</span></label>
            <textarea rows={2} value={corrective} onChange={e => setCorrective(e.target.value)} placeholder="Steps taken to fix this specific issue…" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Preventive Actions</label>
            <textarea rows={2} value={preventive} onChange={e => setPreventive(e.target.value)} placeholder="Steps to prevent recurrence…" className={inputCls} />
          </div>
        </div>
      </div>
      {!aiDone && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={runAi} disabled={aiRunning || !rootCause || !corrective}>
            {aiRunning ? (<span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin" />Analysing…</span>) : '✦ AI Rephrase'}
          </Button>
        </div>
      )}
      {aiDone && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-purple-700">✦ AI Structured Bullets</p>
          <div><p className="text-[10px] text-purple-500 uppercase tracking-wide mb-1">RCA Summary</p>
            <ul className="space-y-1">{aiRca.map((l, i) => <li key={i} className="text-xs text-slate-600 flex gap-2"><span className="text-blue-400">•</span>{l}</li>)}</ul>
          </div>
          <div><p className="text-[10px] text-purple-500 uppercase tracking-wide mb-1">CAPA Summary</p>
            <ul className="space-y-1">{aiCapa.map((l, i) => <li key={i} className="text-xs text-slate-600 flex gap-2"><span className="text-emerald-400">•</span>{l}</li>)}</ul>
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!rootCause || !corrective || !aiDone}>Submit for Approval</Button>
      </div>
    </div>
  );
}

function ApprovalCard({ complaint, onApprove, onReject, users }) {
  const submitter = users.find(u => u.id === complaint.rca?.submittedBy);
  return (
    <Card>
      <div className="flex items-start gap-4 p-5">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${SEVERITY_CONFIG[complaint.severity]?.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700 font-mono">{complaint.id}</span>
            <SeverityBadge severity={complaint.severity} />
            <StatusBadge status={complaint.status} />
          </div>
          <p className="text-xs text-slate-600 mb-1">{complaint.project}</p>
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{complaint.issueDetails}</p>
          {submitter && (
            <p className="text-[10px] text-slate-400 mt-2">
              RCA by {submitter.name} · {complaint.rca?.submittedAt ? formatDistanceToNow(new Date(complaint.rca.submittedAt), { addSuffix: true }) : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Button variant="success" size="sm" icon={CheckCircle} onClick={() => onApprove(complaint.id)}>Approve</Button>
          <Button variant="danger" size="sm" icon={AlertCircle} onClick={() => onReject(complaint.id)}>Return</Button>
        </div>
      </div>
    </Card>
  );
}

export default function RCACAPAList() {
  const { complaints, fetchComplaints } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [submitModal, setSubmitModal] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    adminAPI.getUsers().then(r => { if (r.success) setUsers(r.data); }).catch(() => {});
  }, []);

  const isAuthority = ['Authority', 'Admin'].includes(currentUser.role);
  const isDeptUser  = ['Department User', 'Admin'].includes(currentUser.role);

  const pendingRca     = complaints.filter(c => c.status === 'Assigned' && !c.rca);
  const pendingApproval = complaints.filter(c => c.status === 'RCA Submitted' && c.rca && !c.rca.approvedBy);
  const approved       = complaints.filter(c => c.rca?.approvedBy);

  const submitRca = async (id, data) => {
    await rcaAPI.submit(id, data);
    await fetchComplaints();
  };

  const approveRca = async (id) => {
    await rcaAPI.approve(id);
    await fetchComplaints();
  };

  const returnRca = async (id) => {
    await rcaAPI.returnRca(id);
    await fetchComplaints();
  };

  return (
    <Layout title="RCA / CAPA" subtitle="Root cause analysis and corrective/preventive action management">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Pending RCA" value={pendingRca.length} icon={Clock} color="amber" subtitle="Awaiting submission" />
        <StatCard title="Pending Approval" value={pendingApproval.length} icon={AlertCircle} color="orange" subtitle="Submitted, needs review" />
        <StatCard title="Approved" value={approved.length} icon={CheckCircle} color="green" subtitle="Completed this cycle" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {isDeptUser && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Pending RCA Submission</h2>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{pendingRca.length}</span>
            </div>
            {pendingRca.length === 0 ? (
              <Card className="py-2"><EmptyState icon={CheckCircle} title="No pending RCAs" subtitle="All assigned complaints have RCA submitted" /></Card>
            ) : (
              <div className="space-y-3">
                {pendingRca.map(c => (
                  <Card key={c.id}>
                    <div className="flex items-center gap-3 p-4">
                      <div className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[c.severity]?.dot} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-slate-700 font-mono">{c.id}</span>
                          <SeverityBadge severity={c.severity} />
                        </div>
                        <p className="text-xs text-slate-500 truncate">{c.project}</p>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => setSubmitModal(c)}>Submit RCA</Button>
                    </div>
                    <div className="px-4 pb-3"><p className="text-xs text-slate-600 line-clamp-2">{c.issueDetails}</p></div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {isAuthority && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Pending Approval</h2>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">{pendingApproval.length}</span>
            </div>
            {pendingApproval.length === 0 ? (
              <Card className="py-2"><EmptyState icon={CheckCircle} title="Nothing pending approval" subtitle="All RCAs reviewed" /></Card>
            ) : (
              <div className="space-y-3">
                {pendingApproval.map(c => <ApprovalCard key={c.id} complaint={c} onApprove={approveRca} onReject={returnRca} users={users} />)}
              </div>
            )}
          </div>
        )}

        <div className={isAuthority && isDeptUser ? 'lg:col-span-2' : ''}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Approved RCAs</h2>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">{approved.length}</span>
          </div>
          <div className="space-y-2">
            {approved.slice(0, 5).map(c => {
              const approver = users.find(u => u.id === c.rca?.approvedBy);
              return (
                <button key={c.id} onClick={() => navigate(`/complaints/${c.id}`)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all text-left">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-700">{c.id}</span><SeverityBadge severity={c.severity} /></div>
                    <p className="text-xs text-slate-500 truncate">{c.project}</p>
                  </div>
                  <div className="text-right flex-shrink-0"><p className="text-[10px] text-slate-400">Approved by {approver?.name?.split(' ')[0] || '—'}</p></div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {submitModal && (
        <Modal open={true} onClose={() => setSubmitModal(null)} title="Submit RCA & CAPA" size="lg">
          <RcaSubmitModal complaint={submitModal} onClose={() => setSubmitModal(null)}
            onSubmit={(data) => { submitRca(submitModal.id, data); setSubmitModal(null); }} />
        </Modal>
      )}
    </Layout>
  );
}
