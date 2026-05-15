import { useState, useEffect } from 'react';
import { Edit2, Save, X, Shield } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Card, CardHeader } from '../../components/ui/Card';
import { SeverityBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { adminAPI } from '../../services/api';

export default function EscalationMatrix() {
  const [matrix, setMatrix] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editRow, setEditRow] = useState(null);

  useEffect(() => {
    adminAPI.getMatrix().then(r => { if (r.success) setMatrix(r.data); }).catch(() => {});
  }, []);

  const startEdit = (i) => { setEditing(i); setEditRow({ ...matrix[i] }); };

  const saveEdit = async () => {
    await adminAPI.updateMatrix(editRow.id, editRow);
    setMatrix(prev => prev.map((r, i) => i === editing ? editRow : r));
    setEditing(null);
  };

  const cell = "px-4 py-3 text-xs text-slate-700";
  const inp  = "w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <Layout title="Escalation Matrix" subtitle="Configure SLA thresholds and auto-escalation authorities">
      <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> How Auto-Escalation Works</p>
        <p className="leading-relaxed">When a complaint breaches its SLA threshold (Action Start / RCA / Closure), the system automatically sends notifications to the defined escalation levels. L1 is notified first; if unresolved, L2 and then L3 are escalated to.</p>
      </div>

      <Card className="mb-6">
        <CardHeader title="SLA & Escalation Configuration" subtitle="Click the edit icon on any row to modify thresholds" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Severity','Action Start (hrs)','RCA Due (hrs)','Closure (hrs)','L1 Escalation','L2 Escalation','L3 Escalation',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.map((row, i) => (
                <tr key={row.severity} className="hover:bg-slate-50 transition-colors">
                  <td className={cell}><SeverityBadge severity={row.severity} /></td>
                  {editing === i ? (
                    <>
                      {['actionStart','rca','closure'].map(k => (
                        <td key={k} className="px-4 py-2">
                          <input type="number" value={editRow[k]} onChange={e => setEditRow(p => ({...p,[k]: Number(e.target.value)}))} className={inp} />
                        </td>
                      ))}
                      {['level1','level2','level3'].map(k => (
                        <td key={k} className="px-4 py-2">
                          <input type="text" value={editRow[k]} onChange={e => setEditRow(p => ({...p,[k]: e.target.value}))} className={inp} />
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={saveEdit} className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"><Save className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditing(null)} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={cell}><span className="font-semibold">{row.actionStart}</span>h</td>
                      <td className={cell}><span className="font-semibold">{row.rca}</span>h</td>
                      <td className={cell}><span className="font-semibold">{row.closure}</span>h</td>
                      <td className={cell}>{row.level1}</td>
                      <td className={cell}>{row.level2}</td>
                      <td className={cell}>{row.level3}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => startEdit(i)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="SLA Timeline Visualization" subtitle="Escalation levels triggered over time" />
        <div className="p-6 space-y-6">
          {matrix.map(row => (
            <div key={row.severity}>
              <div className="flex items-center gap-2 mb-3"><SeverityBadge severity={row.severity} /></div>
              <div className="relative">
                <div className="h-2 bg-slate-100 rounded-full">
                  <div className="h-2 rounded-full"
                    style={{
                      background: row.severity === 'Fatal' ? '#EF4444' : row.severity === 'Critical' ? '#F97316' : row.severity === 'Medium' ? '#F59E0B' : '#22C55E',
                      width: '100%',
                    }}
                  />
                </div>
                {[
                  { label: `Action\n${row.actionStart}h`, pct: (row.actionStart / row.closure) * 100 },
                  { label: `RCA\n${row.rca}h`, pct: (row.rca / row.closure) * 100 },
                  { label: `Closure\n${row.closure}h`, pct: 100 },
                ].map(({ label, pct }) => (
                  <div key={label} className="absolute -top-1" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-4 h-4 rounded-full bg-white border-2 border-slate-400 mx-auto" />
                    <p className="text-[9px] text-slate-500 text-center mt-1 whitespace-pre-line leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-6 text-[10px] text-slate-400">
                <span>L1: {row.level1}</span>
                <span>L2: {row.level2}</span>
                <span>L3: {row.level3}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Layout>
  );
}
