import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';

/**
 * Global auth context.
 *
 * Replaces all scattered `localStorage.getItem('token')` calls across components.
 *
 * Usage:
 *   import { useAuth } from '@store/AuthContext';
 *   const { token, user, login, logout, isAuthenticated } = useAuth();
 */

const AuthContext = createContext(null);

function getUserFromToken(token) {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => getUserFromToken(localStorage.getItem('token')));

  /**
   * Call after successful login/register.
   * @param {string} newToken  - JWT from server
   * @param {object} [userData] - Optional extra user data to merge
   */
  const login = useCallback((newToken, userData = null) => {
    localStorage.setItem('token', newToken);
    const decoded = getUserFromToken(newToken);
    setToken(newToken);
    setUser(userData ? { ...decoded, ...userData } : decoded);
  }, []);

  /**
   * Clears all auth state and localStorage.
   */
  const logout = useCallback(() => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token;

  const value = useMemo(
    () => ({ token, user, login, logout, isAuthenticated }),
    [token, user, login, logout, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the auth context.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
