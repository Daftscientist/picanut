import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface User {
  user_id: string;
  username: string;
  is_admin: boolean;
  org_id: string | null;
  role: 'manager' | 'subuser';
  is_platform_admin: boolean;
  default_agent_id: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const data = await apiClient.get<User>('/auth/me');
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch user', err);
      setUser(null);
      apiClient.clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = apiClient.getToken();
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (token: string) => {
    apiClient.setToken(token);
    setLoading(true);
    await fetchMe();
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      apiClient.clearToken();
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
