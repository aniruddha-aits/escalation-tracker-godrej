import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { complaintsAPI, notificationsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { currentUser } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchComplaints = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await complaintsAPI.getAll();
      if (res.success) setComplaints(res.data);
    } catch (e) { console.error('Failed to fetch complaints', e); }
  }, [currentUser]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await notificationsAPI.getAll();
      if (res.success) setNotifications(res.data);
    } catch (e) { console.error('Failed to fetch notifications', e); }
  }, [currentUser]);

  // Load data when user logs in
  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      Promise.all([fetchComplaints(), fetchNotifications()])
        .finally(() => setLoading(false));
    } else {
      setComplaints([]);
      setNotifications([]);
    }
  }, [currentUser, fetchComplaints, fetchNotifications]);

  const updateComplaint = async (id, updates) => {
    try {
      await complaintsAPI.update(id, updates);
      // Optimistic local update
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (e) { console.error('Update failed', e); }
  };

  const addComplaint = async (data) => {
    try {
      const res = await complaintsAPI.create(data);
      if (res.success) await fetchComplaints();
      return res;
    } catch (e) { console.error('Create failed', e); }
  };

  const markNotificationRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) { console.error('Mark read failed', e); }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) { console.error('Mark all read failed', e); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      complaints, updateComplaint, addComplaint, fetchComplaints,
      notifications, markNotificationRead, markAllRead, unreadCount,
      fetchNotifications, loading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
