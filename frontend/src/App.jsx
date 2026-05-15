import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

import Login             from './pages/Login';
import EmailInbox        from './pages/inbox/EmailInbox';
import Dashboard         from './pages/Dashboard';
import ComplaintList     from './pages/complaints/ComplaintList';
import ComplaintDetail   from './pages/complaints/ComplaintDetail';
import NewComplaint      from './pages/complaints/NewComplaint';
import ValidationQueue   from './pages/validation/ValidationQueue';
import RCACAPAList       from './pages/rcacapa/RCACAPAList';
import SLATracker        from './pages/sla/SLATracker';
import Analytics         from './pages/analytics/Analytics';
import Notifications     from './pages/notifications/Notifications';
import UserManagement    from './pages/admin/UserManagement';
import DepartmentConfig  from './pages/admin/DepartmentConfig';
import EscalationMatrix  from './pages/admin/EscalationMatrix';

function ProtectedRoute({ children, roles }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { currentUser } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route path="/dashboard" element={
        <ProtectedRoute roles={['Management','Admin','Authority']}>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/email-inbox" element={
        <ProtectedRoute roles={['Admin', 'Reviewer']}>
          <EmailInbox />
        </ProtectedRoute>
      } />

      <Route path="/complaints" element={
        <ProtectedRoute><ComplaintList /></ProtectedRoute>
      } />
      <Route path="/complaints/new" element={
        <ProtectedRoute roles={['Admin','Reviewer']}><NewComplaint /></ProtectedRoute>
      } />
      <Route path="/complaints/:id" element={
        <ProtectedRoute><ComplaintDetail /></ProtectedRoute>
      } />

      <Route path="/validation" element={
        <ProtectedRoute roles={['Reviewer','Admin']}><ValidationQueue /></ProtectedRoute>
      } />

      <Route path="/rca-capa" element={
        <ProtectedRoute roles={['Authority','Department User','Admin']}><RCACAPAList /></ProtectedRoute>
      } />

      <Route path="/sla-tracker" element={
        <ProtectedRoute roles={['Management','Admin','Authority']}><SLATracker /></ProtectedRoute>
      } />

      <Route path="/analytics" element={
        <ProtectedRoute roles={['Management','Admin']}><Analytics /></ProtectedRoute>
      } />

      <Route path="/notifications" element={
        <ProtectedRoute><Notifications /></ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute roles={['Admin']}><UserManagement /></ProtectedRoute>
      } />
      <Route path="/admin/departments" element={
        <ProtectedRoute roles={['Admin']}><DepartmentConfig /></ProtectedRoute>
      } />
      <Route path="/admin/matrix" element={
        <ProtectedRoute roles={['Admin']}><EscalationMatrix /></ProtectedRoute>
      } />

      {/* Smart default redirect based on role */}
      <Route path="/" element={
        currentUser
          ? <Navigate to={
              ['Management','Admin','Authority'].includes(currentUser.role) ? '/dashboard'
              : currentUser.role === 'Reviewer' ? '/validation'
              : '/complaints'
            } replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
