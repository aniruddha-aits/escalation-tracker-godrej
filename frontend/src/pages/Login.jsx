import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';

const ROLE_DESC = {
  'Admin':           'Full system access — users, config, all modules',
  'Management':      'Dashboard, analytics, read-only complaint visibility',
  'Authority':       'RCA/CAPA approval, complaint oversight',
  'Department User': 'Action updates for assigned complaints',
  'Reviewer':        'AI validation, complaint intake',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [password, setPassword] = useState('demo1234');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch users for demo selector (unauthenticated call will fail, so we use a fallback list)
  useEffect(() => {
    // Try fetching from API, fallback to hardcoded demo list
    adminAPI.getUsers()
      .then(res => { if (res.success) setUsers(res.data); })
      .catch(() => {
        // Fallback demo users when not authenticated
        setUsers([
          { id: 'u1', name: 'Priya Sharma', email: 'priya@godrej.com', role: 'Reviewer', department: 'Quality' },
          { id: 'u2', name: 'Rajesh Kumar', email: 'rajesh@godrej.com', role: 'Department User', department: 'Legal' },
          { id: 'u3', name: 'Anita Mehta', email: 'anita@godrej.com', role: 'Authority', department: 'Operations' },
          { id: 'u4', name: 'Suresh Patel', email: 'suresh@godrej.com', role: 'Authority', department: 'Quality' },
          { id: 'u5', name: 'Neha Singh', email: 'neha@godrej.com', role: 'Management', department: 'CXO Office' },
          { id: 'u6', name: 'Vikram Reddy', email: 'vikram@godrej.com', role: 'Admin', department: 'IT' },
          { id: 'u7', name: 'Deepa Nair', email: 'deepa@godrej.com', role: 'Department User', department: 'Engineering' },
          { id: 'u8', name: 'Kiran Joshi', email: 'kiran@godrej.com', role: 'Department User', department: 'Customer Relations' },
        ]);
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedEmail) return;
    setLoading(true);
    setError('');
    try {
      const res = await login(selectedEmail, password);
      if (res.success) navigate('/dashboard');
      else setError(res.message || 'Login failed');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  const selectedUser = users.find(u => u.email === selectedEmail);
  const grouped = users.reduce((acc, u) => {
    if (!acc[u.role]) acc[u.role] = [];
    acc[u.role].push(u);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">EscalationOS</h1>
          <p className="text-slate-500 text-sm mt-1">Centralized Escalation Management · Godrej Properties</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left — form */}
            <div className="p-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Sign in to your account</h2>
              <p className="text-xs text-slate-500 mb-6">Select a demo user to explore role-specific access</p>

              {error && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Select Demo User</label>
                  <select
                    value={selectedEmail}
                    onChange={e => setSelectedEmail(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    required
                  >
                    <option value="">— Choose user —</option>
                    {Object.entries(grouped).map(([role, usrs]) => (
                      <optgroup key={role} label={role}>
                        {usrs.map(u => (
                          <option key={u.id} value={u.email}>{u.name} · {u.department}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {selectedUser && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                    <span className="font-medium">Access level: </span>
                    {ROLE_DESC[selectedUser.role]}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 pr-10"
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedEmail || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in…</span>
                  ) : (<>Sign In <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>
            </div>

            {/* Right — role guide */}
            <div className="bg-slate-50 border-l border-slate-200 p-8">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Role Access Guide</p>
              <div className="space-y-3">
                {Object.entries(ROLE_DESC).map(([role, desc]) => (
                  <div key={role} className="flex gap-3">
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{role}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Default password for all demo users: <strong>demo1234</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
