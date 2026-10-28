import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { validateToken } from './jwt.js';
import { authSession } from './session.js';
import useAuth from './useAuth.js';

export default function ProtectedRoute({ role, children }) {
  const { session, reason, forbidden } = useAuth();
  let token = null;
  let tokenSession = null;
  let authReason = reason;

  try {
    token = localStorage.getItem('authToken');
    if (token) {
      tokenSession = validateToken(token);
    }
  } catch (error) {
    authReason = error.code || 'invalid_token';
  }

  const isTokenValid = Boolean(tokenSession);
  const sessionToken = session?.token;
  useEffect(() => {
    // Keep Axios and the navbar in sync if storage changed before navigation.
    if (!isTokenValid || token !== sessionToken) {
      authSession.restore();
    }
  }, [token, sessionToken, isTokenValid]);

  if (!tokenSession) {
    return <Navigate to="/login" replace state={{ authReason }} />;
  }
  if (tokenSession.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (forbidden) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (sessionToken !== token) {
    return null;
  }
  return children;
}
