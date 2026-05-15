import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session from stored JWT
  useEffect(() => {
    const token = localStorage.getItem('escalation_token');
    if (token) {
      authAPI.me()
        .then(res => setCurrentUser(res.user))
        .catch(() => { clearToken(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    if (res.success) {
      setToken(res.token);
      setCurrentUser(res.user);
    }
    return res;
  };

  const logout = () => {
    clearToken();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
