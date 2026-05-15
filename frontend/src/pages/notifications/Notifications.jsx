import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, CheckCircle, Clock, CheckCircle2, UserPlus, Info } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { formatDistanceToNow } from 'date-fns';

const NOTIF_ICONS = {
  SLA_BREACH: { icon: AlertTriangle, bg: 'bg-red-100', color: 'text-red-600' },
  ASSIGNMENT: { icon: UserPlus,      bg: 'bg-blue-100', color: 'text-blue-600' },
  RCA_SUBMITTED: { icon: Clock,      bg: 'bg-orange-100', color: 'text-orange-600' },
  VALIDATION: { icon: Info,          bg: 'bg-purple-100', color: 'text-purple-600' },
  SLA_WARNING: { icon: AlertTriangle, bg: 'bg-amber-100', color: 'text-amber-600' },
  CLOSURE:    { icon: CheckCircle2,  bg: 'bg-emerald-100', color: 'text-emerald-600' },
};

export default function Notifications() {
  const { notifications, markNotificationRead, markAllRead, fetchNotifications, loading } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifClick = (n) => {
    if (!n.read) markNotificationRead(n.id);
    if (n.complaintId) navigate(`/complaints/${n.complaintId}`);
  };

  return (
    <Layout title="Notifications" subtitle="System alerts, SLA warnings, and assignments">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-slate-500 font-medium">
          {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" icon={CheckCircle} onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-xs text-slate-400">Loading notifications…</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
            <p className="text-xs text-slate-500 mt-1">We'll alert you when there's an update</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map(n => {
              const IconComp = NOTIF_ICONS[n.type]?.icon || Bell;
              const bg = NOTIF_ICONS[n.type]?.bg || 'bg-slate-100';
              const color = NOTIF_ICONS[n.type]?.color || 'text-slate-600';
              
              return (
                <button key={n.id} onClick={() => handleNotifClick(n)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 ${n.read ? 'opacity-60' : 'bg-blue-50/30'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <IconComp className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-sm ${n.read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>{n.title}</p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-1.5 leading-relaxed">{n.message}</p>
                    {n.complaintId && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {n.complaintId}
                      </span>
                    )}
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </Layout>
  );
}
