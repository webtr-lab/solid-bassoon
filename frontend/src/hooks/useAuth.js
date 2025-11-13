import { useState, useEffect } from 'react';
import { apiFetch, getErrorMessage, isAuthError } from '../utils/apiClient';
import logger from '../utils/logger';

/**
 * useAuth Hook
 * Manages authentication state, login, logout, and password changes
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await apiFetch('/api/auth/check');

      if (data.authenticated) {
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

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handlePasswordChanged = async () => {
    // Re-check auth to get updated user info
    await checkAuth();
  };

  const handleLogout = async () => {
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
