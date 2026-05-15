import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, ArrowUpDown, ExternalLink } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { SeverityBadge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, configAPI } from '../../services/api';
import { SEVERITY_CONFIG } from '../../data/mockData';
import { formatDistanceToNow, format } from 'date-fns';

const STATUSES = ['All', 'New', 'Pending Validation', 'Under Review', 'Assigned', 'RCA Pending', 'CAPA Pending', 'RCA Submitted', 'Rectification Done', 'Awaiting Customer Closure', 'Closed'];
const SEVERITIES = ['All', 'Fatal', 'Critical', 'Medium', 'Low'];

export default function ComplaintList() {
  const { complaints } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('All');
  const [severityFilter, setSeverity] = useState('All');
  const [zoneFilter, setZone]         = useState('All');
  const [deptFilter, setDept]         = useState('All');
  const [sortKey, setSortKey]         = useState('raisedOn');
  const [sortDir, setSortDir]         = useState('desc');

  useEffect(() => {
    adminAPI.getUsers().then(r => { if (r.success) setUsers(r.data); }).catch(() => {});
    configAPI.enums().then(r => { if (r.success) { setZones(r.data.zones || []); setDepartments(r.data.departments || []); } }).catch(() => {});
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  let visible = complaints.filter(c => {
    if (currentUser.role === 'Department User' && c.assignedTo !== currentUser.id) return false;
    if (search && !`${c.id} ${c.project} ${c.issueDetails}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (severityFilter !== 'All' && c.severity !== severityFilter) return false;
    if (zoneFilter !== 'All' && c.zone !== zoneFilter) return false;
    if (deptFilter !== 'All' && c.department !== deptFilter) return false;
    return true;
  });

  visible = [...visible].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === 'raisedOn') { av = new Date(av); bv = new Date(bv); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortTh = ({ k, label }) => (
    <th onClick={() => toggleSort(k)} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap">
      <span className="flex items-center gap-1">{label} <ArrowUpDown className="w-3 h-3" /></span>
    </th>
  );

  const canAdd = ['Admin', 'Reviewer'].includes(currentUser.role);

  return (
    <Layout title="All Complaints" subtitle={`${visible.length} escalation${visible.length !== 1 ? 's' : ''} found`}>
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, project, issue…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {[
              { label: 'Status',   val: statusFilter,   set: setStatus,   opts: STATUSES },
              { label: 'Severity', val: severityFilter, set: setSeverity, opts: SEVERITIES },
              { label: 'Zone',     val: zoneFilter,     set: setZone,     opts: ['All', ...zones] },
              { label: 'Dept',     val: deptFilter,     set: setDept,     opts: ['All', ...departments] },
            ].map(({ label, val, set, opts }) => (
              <select key={label} value={val} onChange={e => set(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700">
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
          </div>
          {canAdd && (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/complaints/new')}>
              New Complaint
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <SortTh k="id" label="ID" />
                <SortTh k="project" label="Project" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Department</th>
                <SortTh k="raisedOn" label="Raised On" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Assignee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">SLA</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-sm text-slate-400">No complaints match your filters</td></tr>
              )}
              {visible.map(c => {
                const assignee = users.find(u => u.id === c.assignedTo);
                const rcaDue   = new Date(c.rcaDue);
                const slaBreach = c.status !== 'Closed' && c.rca === null && rcaDue < new Date();
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/complaints/${c.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEVERITY_CONFIG[c.severity]?.dot}`} />
                        <span className="text-xs font-semibold text-blue-600 font-mono">{c.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 font-medium max-w-[160px] truncate">{c.project}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                    <td className="px-4 py-3"><StatusBadge status={slaBreach ? 'SLA Breached' : c.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.zone}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.department || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{c.raisedOn ? format(new Date(c.raisedOn), 'dd MMM yy') : '—'}</td>
                    <td className="px-4 py-3">
                      {assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700">{assignee.avatar}</div>
                          <span className="text-xs text-slate-600">{assignee.name.split(' ')[0]}</span>
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.status !== 'Closed' && (
                        <span className={`text-[10px] font-medium ${slaBreach ? 'text-red-600' : 'text-slate-500'}`}>
                          {slaBreach ? 'BREACHED' : formatDistanceToNow(rcaDue, { addSuffix: true })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <p className="text-xs text-slate-500">Showing {visible.length} of {complaints.length} escalations</p>
          <div className="flex gap-2">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {['Fatal','Critical','Medium','Low'].map(s => (
                <span key={s} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[s].dot}`} />{s}: {complaints.filter(c=>c.severity===s).length}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
