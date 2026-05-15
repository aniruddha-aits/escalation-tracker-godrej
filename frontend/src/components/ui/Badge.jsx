import { SEVERITY_CONFIG, STATUS_CONFIG } from '../../data/mockData';

export function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || {};
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {severity}
    </span>
  );
}

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {status}
    </span>
  );
}

export function Badge({ children, color = 'slate' }) {
  const colors = {
    slate:  'bg-slate-100 text-slate-700',
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}
