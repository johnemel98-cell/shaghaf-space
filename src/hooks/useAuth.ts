import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '../types';
import { apiClient } from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, branch_id: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            setUser(JSON.parse(userData));
          } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      }
    } catch (error) {
      console.error('Error in auth initialization:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-login for development
  useEffect(() => {
    if (!loading && !user && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      console.log('🔧 Development mode: Auto-logging in as admin...');
      
      // Simulate successful login with default admin user
      const defaultUser = {
        id: '1',
        name: 'مدير النظام',
        email: 'admin@shaghaf.eg',
        role: 'admin' as const,
        branch_id: '1'
      };
      // Simple mock token for development
      const mockToken = 'dev-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(defaultUser));
      setUser(defaultUser);
    }
  }, [loading, user, autoLoginAttempted]);
  const login = async (email: string, password: string, branch_id: string): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      
      const response = await apiClient.login(email, password, branch_id);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      setLoading(false);
      return { success: false, message: (error as Error).message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return {
    user,
    login,
    logout,
    loading
  };
};

export { AuthContext };