import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Shield } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { adminAPI, configAPI } from '../../services/api';

const ROLES = ['Admin', 'Management', 'Authority', 'Department User', 'Reviewer'];
const ROLE_COLORS = {
  Admin:          'bg-red-100 text-red-700',
  Management:     'bg-purple-100 text-purple-700',
  Authority:      'bg-orange-100 text-orange-700',
  'Department User': 'bg-blue-100 text-blue-700',
  Reviewer:       'bg-teal-100 text-teal-700',
};
const ACCESS_MAP = {
  Admin:          ['All Modules', 'User Management', 'System Config'],
  Management:     ['Dashboard', 'Analytics', 'Complaints (read)', 'Notifications'],
  Authority:      ['RCA/CAPA Approval', 'Complaints', 'SLA Tracker', 'Notifications'],
  'Department User': ['Assigned Complaints', 'RCA/CAPA Submit', 'Notifications'],
  Reviewer:       ['Validation Queue', 'New Complaint', 'Notifications'],
};

export default function UserManagement() {
  const [users, setUsers]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [zones, setZones]     = useState([]);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('All');
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({ name: '', email: '', role: 'Reviewer', department: '', zone: 'All', password: 'demo1234' });

  useEffect(() => {
    adminAPI.getUsers().then(r => { if (r.success) setUsers(r.data); }).catch(() => {});
    configAPI.enums().then(r => { if (r.success) { setDepartments(r.data.departments||[]); setZones(r.data.zones||[]); } }).catch(() => {});
  }, []);

  const filtered = users.filter(u => {
    if (search && !`${u.name} ${u.email} ${u.department}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    return true;
  });

  const save = async () => {
    if (modal === 'new') {
      await adminAPI.createUser(form);
      const r = await adminAPI.getUsers();
      if (r.success) setUsers(r.data);
    }
    setModal(null);
    setForm({ name: '', email: '', role: 'Reviewer', department: '', zone: 'All', password: 'demo1234' });
  };

  const del = async (id) => {
    await adminAPI.deleteUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const inp = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <Layout title="User Management" subtitle="Manage system users and role assignments">
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, department…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
        </div>
        <select value={roleFilter} onChange={e => setRole(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {['All', ...ROLES].map(r => <option key={r}>{r}</option>)}
        </select>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setModal('new')}>Add User</Button>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-5">
        {ROLES.map(role => (
          <div key={role} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-xl font-bold text-slate-800">{users.filter(u => u.role === role).length}</p>
            <p className={`mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block ${ROLE_COLORS[role]}`}>{role}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['User', 'Role', 'Department', 'Zone', 'Access', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">{u.avatar}</div>
                      <div><p className="text-xs font-semibold text-slate-800">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{u.department}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{u.zone}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(ACCESS_MAP[u.role] || []).slice(0, 2).map(a => (<span key={a} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{a}</span>))}
                      {ACCESS_MAP[u.role]?.length > 2 && (<span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">+{ACCESS_MAP[u.role].length - 2}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(u.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal === 'new'} onClose={() => setModal(null)} title="Add New User" size="sm">
        <div className="space-y-4">
          {[{ label: 'Full Name', key: 'name', type: 'text', placeholder: 'Priya Sharma' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'priya@godrej.com' }].map(({ label, key, type, placeholder }) => (
            <div key={key}><label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} placeholder={placeholder} className={inp} /></div>
          ))}
          <div><label className="block text-xs font-medium text-slate-700 mb-1.5">Role</label>
            <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} className={inp}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-700 mb-1.5">Department</label>
              <select value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} className={inp}>
                <option value="">Select</option>{departments.map(d => <option key={d}>{d}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1.5">Zone</label>
              <select value={form.zone} onChange={e => setForm(p => ({...p, zone: e.target.value}))} className={inp}>
                <option>All</option>{zones.map(z => <option key={z}>{z}</option>)}
              </select></div>
          </div>
          {form.role && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1"><Shield className="w-3 h-3" /> Access for {form.role}</p>
              <ul className="space-y-1">{(ACCESS_MAP[form.role] || []).map(a => (<li key={a} className="text-xs text-blue-600 flex gap-1.5"><span>•</span>{a}</li>))}</ul>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={!form.name || !form.email}>Create User</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
