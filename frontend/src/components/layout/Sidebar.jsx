import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ClipboardCheck, AlertTriangle,
  BarChart3, Bell, Shield, Users, LogOut,
  ChevronDown, Building2, GitMerge, Layers, Inbox,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useState } from 'react';

const NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',       roles: ['Management', 'Admin', 'Authority'] },
      { to: '/notifications', icon: Bell,            label: 'Notifications',   roles: ['Management', 'Admin', 'Authority', 'Reviewer', 'Department User'] },
    ],
  },
  {
    label: 'Complaints',
    items: [
      { to: '/email-inbox',       icon: Inbox,         label: 'Email Inbox',         roles: ['Admin', 'Reviewer'], badge: 'AI' },
      { to: '/complaints',        icon: FileText,      label: 'All Complaints',      roles: ['Management', 'Admin', 'Authority', 'Reviewer', 'Department User'] },
      { to: '/complaints/new',    icon: Layers,        label: 'New Complaint',        roles: ['Admin', 'Reviewer'] },
      { to: '/validation',        icon: ClipboardCheck, label: 'Validation Queue',   roles: ['Reviewer', 'Admin'] },
    ],
  },
  {
    label: 'Investigation',
    items: [
      { to: '/rca-capa',        icon: GitMerge,      label: 'RCA / CAPA',          roles: ['Authority', 'Department User', 'Admin'] },
      { to: '/sla-tracker',     icon: AlertTriangle, label: 'SLA Tracker',         roles: ['Management', 'Admin', 'Authority'] },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/analytics',       icon: BarChart3,     label: 'Analytics',           roles: ['Management', 'Admin'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/users',        icon: Users,       label: 'User Management',     roles: ['Admin'] },
      { to: '/admin/departments',  icon: Building2,   label: 'Departments',         roles: ['Admin'] },
      { to: '/admin/matrix',       icon: Shield,      label: 'Escalation Matrix',   roles: ['Admin'] },
    ],
  },
];

export function Sidebar() {
  const { currentUser, logout } = useAuth();
  const { unreadCount } = useApp();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState({});

  const toggleSection = (label) => setCollapsed(p => ({ ...p, [label]: !p[label] }));

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleGroups = NAV.map(group => ({
    ...group,
    items: group.items.filter(item => item.roles.includes(currentUser?.role)),
  })).filter(g => g.items.length > 0);

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">EscalationOS</p>
            <p className="text-[10px] text-slate-400">Godrej Properties</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin px-3">
        {visibleGroups.map(group => (
          <div key={group.label} className="mb-4">
            <button
              onClick={() => toggleSection(group.label)}
              className="flex items-center justify-between w-full px-2 mb-1"
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{group.label}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${collapsed[group.label] ? '-rotate-90' : ''}`} />
            </button>
            {!collapsed[group.label] && group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-none tracking-wide">
                    {item.badge}
                  </span>
                )}
                {item.to === '/notifications' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-default">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {currentUser?.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser?.role}</p>
          </div>
          <button onClick={handleLogout} title="Logout" className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
