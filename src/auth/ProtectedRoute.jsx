import { Navigate, Outlet } from 'react-router-dom';
import useAuth from './useAuth.js';
import { authSession } from './session.js';
import AccessDenied from '../pages/dashboard/AccessDenied.jsx';

export default function ProtectedRoute({ role }) {
  const { session, reason, forbidden } = useAuth();
  // Recheck the clock on every navigation/render, even if a background-tab timer
  // has been delayed. An expired token must never mount protected content.
  // eslint-disable-next-line react-hooks/purity
  if (!session || session.expiresAt <= Date.now()) {
    let authReason = reason;
    if (session) {
      authReason = 'expired';
    }
    return <Navigate to="/login" replace state={{ authReason }} />;
  }
  if (session.role !== role) {
    return <AccessDenied />;
  }
  if (forbidden) {
    return <AccessDenied onDismiss={authSession.dismissForbidden} />;
  }
  return <Outlet />;
}
