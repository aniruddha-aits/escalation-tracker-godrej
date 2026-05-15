import { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { analyticsAPI } from '../../services/api';
import { TrendingUp, Award, AlertTriangle, BarChart3, RefreshCcw } from 'lucide-react';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    analyticsAPI.reports().then(r => { if (r.success) setData(r.data); }).catch(() => {});
  }, []);

  if (!data) return (
    <Layout title="Analytics & Reports" subtitle="Loading…">
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  const { monthlyTrend, severityDistribution, departmentWise, zoneWise, avgResolutionDays, repeatIssues } = data;
  const totalComplaints = monthlyTrend.reduce((a, b) => a + (b.total || 0), 0) || 1;
  const totalClosed     = monthlyTrend.reduce((a, b) => a + (b.closed || 0), 0);
  const totalBreached   = monthlyTrend.reduce((a, b) => a + (b.breached || 0), 0);
  const slaAdherence    = Math.round(((totalComplaints - totalBreached) / totalComplaints) * 100);

  return (
    <Layout title="Analytics & Reports" subtitle="Advanced performance metrics and trend intelligence">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total (6 Months)"   value={totalComplaints} icon={BarChart3}    color="blue"   subtitle="All channels" />
        <StatCard title="SLA Adherence"      value={`${slaAdherence}%`} icon={Award}    color="green"  subtitle="Within targets" />
        <StatCard title="Total Breaches"     value={totalBreached}  icon={AlertTriangle} color="red"    subtitle="Across all severity" />
        <StatCard title="Resolution Rate"    value={`${Math.round((totalClosed/totalComplaints)*100)}%`} icon={TrendingUp} color="purple" subtitle="Successfully closed" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Monthly Trend — Total vs Closed vs Breached" />
          <div className="p-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total"   name="Total"   fill="#3B82F6" radius={[4,4,0,0]} />
                <Bar dataKey="closed"  name="Closed"  fill="#10B981" radius={[4,4,0,0]} />
                <Bar dataKey="breached" name="Breached" fill="#EF4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Severity Distribution" />
          <div className="p-5 h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityDistribution} cx="45%" cy="50%" outerRadius={85} innerRadius={50} dataKey="value" paddingAngle={3}>
                  {severityDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Department-wise Open vs Closed" />
          <div className="p-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentWise} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open"   name="Open"   fill="#FB923C" radius={[0,4,4,0]} />
                <Bar dataKey="closed" name="Closed" fill="#34D399" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Zone-wise Distribution" />
          <div className="p-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={zoneWise}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="zone" tick={{ fontSize: 11, fill: '#64748B' }} />
                <Radar name="Complaints" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Avg Resolution Time vs SLA Target" subtitle="In days" />
          <div className="p-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgResolutionDays} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="severity" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}d`]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="days"   name="Actual"  fill="#6366F1" radius={[4,4,0,0]} />
                <Bar dataKey="target" name="Target"  fill="#E2E8F0" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Top Recurring Issue Types" icon={RefreshCcw} subtitle="Potential systemic problems" />
          <div className="p-5">
            <div className="space-y-3">
              {(repeatIssues || []).map((issue, i) => {
                const max = (repeatIssues[0]?.count) || 1;
                const pct = (issue.count / max) * 100;
                return (
                  <div key={issue.type} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 font-medium">{issue.type}</span>
                      <span className="font-bold text-slate-800">{issue.count} cases</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
              <strong>AI Insight:</strong> Review recurring issue types for systemic patterns. Consider zone-wide quality audits.
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
