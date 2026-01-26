import { useState, useEffect } from 'react';
import { apiFetch, getErrorMessage } from '../utils/apiClient';
import logger from '../utils/logger';
import { User } from '../types';

interface AuthCheckResponse {
  authenticated: boolean;
  user?: User;
}

interface UseAuthReturn {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  handleLoginSuccess: (user: User) => void;
  handlePasswordChanged: () => Promise<void>;
  handleLogout: () => Promise<void>;
  setError: (error: string | null) => void;
}

/**
 * useAuth Hook
 * Manages authentication state, login, logout, and password changes
 */
export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async (): Promise<void> => {
    try {
      const data = await apiFetch<AuthCheckResponse>('/api/auth/check');

      if (data.authenticated && data.user) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        setError(null);
      }
    } catch (err) {
      logger.error('Auth check error', err);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: User): void => {
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handlePasswordChanged = async (): Promise<void> => {
    // Re-check auth to get updated user info
    await checkAuth();
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setCurrentUser(null);
      setError(null);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Logout failed');
      setError(errorMsg);
      logger.error('Logout error', err);
    }
  };

  return {
    isAuthenticated,
    currentUser,
    loading,
    error,
    checkAuth,
    handleLoginSuccess,
    handlePasswordChanged,
    handleLogout,
    setError
  };
};
