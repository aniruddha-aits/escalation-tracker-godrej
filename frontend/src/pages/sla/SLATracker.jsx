import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, ArrowRight, TrendingDown } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { SeverityBadge, StatusBadge } from '../../components/ui/Badge';
import { StatCard, Card, CardHeader } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { adminAPI } from '../../services/api';
import { SEVERITY_CONFIG } from '../../data/mockData';
import { formatDistanceToNow, differenceInHours, format } from 'date-fns';

function SlaBar({ label, startedAt, dueHours, done = false }) {
  const start  = new Date(startedAt);
  const due    = new Date(start.getTime() + dueHours * 3600000);
  const now    = new Date();
  const elapsed = differenceInHours(now, start);
  const pct    = Math.min((elapsed / dueHours) * 100, 100);
  const breach = !done && now > due;
  const warning = !breach && pct >= 70;

  const barColor = done ? 'bg-emerald-400' : breach ? 'bg-red-500' : warning ? 'bg-amber-400' : 'bg-blue-400';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className={`font-semibold ${done ? 'text-emerald-600' : breach ? 'text-red-600' : warning ? 'text-amber-600' : 'text-blue-600'}`}>
          {done ? 'Completed' : breach ? 'BREACHED' : `Due ${formatDistanceToNow(due, { addSuffix: true })}`}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Started {format(start, 'dd MMM HH:mm')}</span>
        <span>Due {format(due, 'dd MMM HH:mm')}</span>
      </div>
    </div>
  );
}

export default function SLATracker() {
  const { complaints } = useApp();
  const navigate = useNavigate();
  const [ESCALATION_MATRIX, setMatrix] = useState([]);

  useEffect(() => {
    adminAPI.getMatrix().then(r => { if (r.success) setMatrix(r.data); }).catch(() => {});
  }, []);

  const open = complaints.filter(c => c.status !== 'Closed');

  const breached = open.filter(c => {
    const rcaDue = new Date(c.rcaDue);
    return c.rca === null && rcaDue < new Date();
  });

  const warning = open.filter(c => {
    const rcaDue = new Date(c.rcaDue);
    const hoursLeft = differenceInHours(rcaDue, new Date());
    return c.rca === null && hoursLeft >= 0 && hoursLeft <= 12;
  });

  const onTrack = open.filter(c => !breached.find(b => b.id === c.id) && !warning.find(w => w.id === c.id));

  const getSlaStatus = (c) => {
    const slaH = SEVERITY_CONFIG[c.severity]?.sla;
    if (!slaH) return {};
    const started = new Date(c.slaStarted);
    const actionDue  = new Date(started.getTime() + slaH.actionStart * 3600000);
    const rcaDue     = new Date(started.getTime() + slaH.rca * 3600000);
    const closureDue = new Date(started.getTime() + slaH.closure * 3600000);
    const now = new Date();
    return {
      actionStart:  { done: c.actions?.length > 0, breach: now > actionDue && !c.actions?.length },
      rcaSubmit:    { done: !!c.rca, breach: now > rcaDue && !c.rca },
      closure:      { done: c.status === 'Closed', breach: now > closureDue && c.status !== 'Closed' },
    };
  };

  return (
    <Layout title="SLA Tracker" subtitle="Service Level Agreement monitoring and breach alerts">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="SLA Breached" value={breached.length} icon={AlertTriangle} color="red" subtitle="Immediate action required" />
        <StatCard title="At Risk" value={warning.length} icon={Clock} color="amber" subtitle="RCA due within 12 hours" />
        <StatCard title="On Track" value={onTrack.length} icon={CheckCircle} color="green" subtitle="Within SLA targets" />
      </div>

      {/* Escalation Matrix Reference */}
      <Card className="mb-6">
        <CardHeader title="Escalation Matrix" subtitle="SLA thresholds and escalation levels" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                {['Severity','Action Start','RCA Due','Closure','L1 Escalation','L2 Escalation','L3 Escalation'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ESCALATION_MATRIX.map(row => (
                <tr key={row.severity} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5"><SeverityBadge severity={row.severity} /></td>
                  <td className="px-4 py-2.5 text-slate-700">{row.actionStart}h</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.rca}h</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.closure}h</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.level1}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.level2}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.level3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Complaints with SLA detail */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Per-Complaint SLA Progress</h2>
        {open.length === 0 && (
          <Card className="py-8 text-center text-sm text-slate-400">All complaints closed</Card>
        )}
        {open.map(c => {
          const sla = getSlaStatus(c);
          const slaH = SEVERITY_CONFIG[c.severity]?.sla;
          const totalBreaches = Object.values(sla).filter(v => v.breach).length;

          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[c.severity]?.dot}`} />
                  <span className="text-xs font-bold text-slate-700 font-mono">{c.id}</span>
                  <SeverityBadge severity={c.severity} />
                  <StatusBadge status={c.status} />
                  {totalBreaches > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      <AlertTriangle className="w-2.5 h-2.5" />{totalBreaches} breach{totalBreaches > 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
                <button onClick={() => navigate(`/complaints/${c.id}`)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                  View <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="px-5 py-1.5">
                <p className="text-xs text-slate-500 truncate">{c.project} · {c.issueDetails.slice(0, 80)}…</p>
              </div>
              {slaH && (
                <div className="px-5 pb-5 pt-3 grid sm:grid-cols-3 gap-5">
                  <SlaBar label="Action Start" startedAt={c.slaStarted} dueHours={slaH.actionStart} done={sla.actionStart?.done} />
                  <SlaBar label="RCA Submission" startedAt={c.slaStarted} dueHours={slaH.rca} done={sla.rcaSubmit?.done} />
                  <SlaBar label="Closure" startedAt={c.slaStarted} dueHours={slaH.closure} done={sla.closure?.done} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
