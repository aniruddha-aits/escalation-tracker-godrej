import { useState, useEffect } from 'react';
import { Plus, Edit2, Building2, Users } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { adminAPI } from '../../services/api';

const DEPT_COLORS = {
  Legal: 'bg-blue-100 text-blue-700', Quality: 'bg-purple-100 text-purple-700',
  Operations: 'bg-orange-100 text-orange-700', Finance: 'bg-emerald-100 text-emerald-700',
  'Customer Relations': 'bg-pink-100 text-pink-700', Engineering: 'bg-cyan-100 text-cyan-700',
  Procurement: 'bg-amber-100 text-amber-700', HR: 'bg-rose-100 text-rose-700',
};

export default function DepartmentConfig() {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    adminAPI.getDepartments().then(r => { if (r.success) setDepartments(r.data); }).catch(() => {});
    adminAPI.getUsers().then(r => { if (r.success) setUsers(r.data); }).catch(() => {});
  }, []);

  return (
    <Layout title="Department Configuration" subtitle="Map departments to issue types and escalation authorities">
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" icon={Plus}>Add Department</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {departments.map(dept => {
          const color = DEPT_COLORS[dept.name] || 'bg-slate-100 text-slate-600';
          const members = users.filter(u => u.department === dept.name);
          return (
            <Card key={dept.id}>
              <CardHeader
                title={dept.name}
                action={
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                }
              />
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Department Head</p>
                    <p className="font-medium text-slate-700">{dept.head || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Escalates To</p>
                    <p className="font-medium text-slate-700">{dept.escalateTo || '—'}</p>
                  </div>
                </div>

                {dept.issueTypes?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Handles Issue Types</p>
                    <div className="flex flex-wrap gap-1">
                      {dept.issueTypes.map(t => (
                        <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Team Members ({members.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {members.length === 0 ? (
                      <span className="text-xs text-slate-400">No members assigned</span>
                    ) : members.map(u => (
                      <div key={u.id} className="flex items-center gap-1 bg-slate-50 rounded-full px-2 py-0.5 border border-slate-100">
                        <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-700">{u.avatar}</div>
                        <span className="text-[10px] text-slate-600">{u.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
