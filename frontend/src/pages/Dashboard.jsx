import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, AlertTriangle, CheckCircle, Clock, TrendingUp,
  ArrowRight, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Layout } from '../components/layout/Layout';
import { StatCard, Card, CardHeader } from '../components/ui/Card';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { useApp } from '../context/AppContext';
import { analyticsAPI, adminAPI } from '../services/api';
import { SEVERITY_CONFIG } from '../data/mockData';
import { formatDistanceToNow } from 'date-fns';

function SlaProgressBar({ label, value, target, color }) {
  const pct = Math.min((value / target) * 100, 100);
  const over = value > target;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className={`font-semibold ${over ? 'text-red-600' : 'text-emerald-600'}`}>{value}d / {target}d</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${over ? 'bg-red-400' : color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { complaints } = useApp();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    analyticsAPI.reports().then(res => { if (res.success) setAnalytics(res.data); }).catch(() => {});
    adminAPI.getUsers().then(res => { if (res.success) setUsers(res.data); }).catch(() => {});
  }, []);

  const open     = complaints.filter(c => c.status !== 'Closed').length;
  const closed   = complaints.filter(c => c.status === 'Closed').length;
  const breached = complaints.filter(c => {
    if (c.status === 'Closed') return false;
    const rcaDue = new Date(c.rcaDue);
    return c.rca === null && rcaDue < new Date();
  }).length;
  const pending  = complaints.filter(c => c.status === 'Pending Validation').length;

  const recentComplaints = [...complaints]
    .sort((a, b) => new Date(b.raisedOn) - new Date(a.raisedOn))
    .slice(0, 5);

  const criticalOpen = complaints.filter(c => (c.severity === 'Fatal' || c.severity === 'Critical') && c.status !== 'Closed');

  const monthlyTrend = analytics?.monthlyTrend || [];
  const severityDistribution = analytics?.severityDistribution || [];
  const avgResolutionDays = analytics?.avgResolutionDays || [];

  return (
    <Layout title="Dashboard" subtitle="Real-time escalation overview">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Open" value={open} subtitle="Active escalations" icon={FileText} color="blue" trend={`${complaints.length} total`} />
        <StatCard title="SLA Breached" value={breached} subtitle="Requires immediate action" icon={AlertTriangle} color="red" trend={complaints.length ? `${Math.round((breached/complaints.length)*100)}% of total` : '0%'} />
        <StatCard title="Closed" value={closed} subtitle="Successfully resolved" icon={CheckCircle} color="green" trend="On track" />
        <StatCard title="Pending Validation" value={pending} subtitle="Awaiting AI review" icon={Clock} color="purple" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Monthly Escalation Trend" subtitle="Total vs Closed" />
          <div className="p-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }} />
                <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} fill="url(#gTotal)" name="Total" />
                <Area type="monotone" dataKey="closed" stroke="#10B981" strokeWidth={2} fill="url(#gClosed)" name="Closed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Severity Distribution" />
          <div className="p-5 h-56 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityDistribution} cx="40%" cy="50%" outerRadius={75} innerRadius={45} dataKey="value" paddingAngle={3}>
                  {severityDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Escalations"
            action={
              <button onClick={() => navigate('/complaints')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="divide-y divide-slate-50">
            {recentComplaints.map(c => {
              const assignee = users.find(u => u.id === c.assignedTo);
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/complaints/${c.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_CONFIG[c.severity]?.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">{c.id}</span>
                      <SeverityBadge severity={c.severity} />
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.project} · {(c.issueDetails || '').slice(0, 60)}…</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <StatusBadge status={c.status} />
                    {c.raisedOn && <p className="text-[10px] text-slate-400 mt-1">{formatDistanceToNow(new Date(c.raisedOn), { addSuffix: true })}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Avg Resolution vs Target" subtitle="Days" />
            <div className="p-5 space-y-4">
              {avgResolutionDays.map(d => (
                <SlaProgressBar key={d.severity} label={d.severity} value={d.days} target={d.target}
                  color={d.days <= d.target ? 'bg-emerald-400' : 'bg-red-400'}
                />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Critical Attention Required" icon={Zap} />
            <div className="divide-y divide-slate-50">
              {criticalOpen.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-5">All critical issues resolved</p>
              ) : criticalOpen.slice(0, 3).map(c => (
                <button key={c.id} onClick={() => navigate(`/complaints/${c.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_CONFIG[c.severity]?.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{c.id}</p>
                    <p className="text-[10px] text-slate-500 truncate">{c.project}</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
