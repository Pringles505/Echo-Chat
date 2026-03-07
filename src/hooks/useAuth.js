import { useAuth } from '../store/AuthContext'

/**
 * Convenience re-export of useAuth from the AuthContext.
 *
 * Usage:
 *   import { useAuth } from '@hooks/useAuth';
 *   const { isAuthenticated, user, logout } = useAuth();
 */
export { useAuth }
export default useAuth
