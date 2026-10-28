import ErrorPage from '../../components/layout/ErrorPage.jsx';
import { authSession } from '../../auth/session.js';

export default function AccessDenied() {
  return (
    <ErrorPage
      title="403 — Access Denied"
      message="You do not have permission to access this page."
      onGoToLogin={authSession.dismissForbidden}
    />
  );
}
