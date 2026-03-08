import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { saveAuthData, getAuthData, clearAuthData, AuthUser } from '../utils/storage';
import { authAPI, AuthResponse } from '../api/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (response: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadAuth();
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // Heartbeat
  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (user) {
      heartbeatRef.current = setInterval(() => {
        authAPI.heartbeat(user.userId).catch(() => {});
      }, 60000);
    }
  }, [user]);

  const loadAuth = async () => {
    try {
      const data = await getAuthData();
      if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const login = async (response: AuthResponse) => {
    const u: AuthUser = {
      userId: response.userId,
      name: response.name,
      email: response.email,
      role: response.role,
    };
    await saveAuthData(response.token, u);
    setToken(response.token);
    setUser(u);
  };

  const logout = async () => {
    if (user) {
      try { await authAPI.logout(user.userId); } catch {}
    }
    await clearAuthData();
    setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    await loadAuth();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
