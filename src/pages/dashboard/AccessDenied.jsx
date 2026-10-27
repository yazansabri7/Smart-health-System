import { Alert, Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { AUTH_MESSAGES, ROLE_HOME } from '../../auth/jwt.js';
import { authSession } from '../../auth/session.js';
import useAuth from '../../auth/useAuth.js';

export default function AccessDenied({ onDismiss }) {
  const { session } = useAuth();
  let returnPath = '/login';
  let returnLabel = 'login';
  if (session) {
    returnPath = ROLE_HOME[session.role];
    returnLabel = 'your dashboard';
  }

  return (
    <Box component="main" sx={{ maxWidth: 640, mx: 'auto', p: 3, pt: 8 }}>
      <Typography component="h1" variant="h4" sx={{ mb: 2 }}>Unauthorized access</Typography>
      <Alert severity="error" sx={{ mb: 3 }}>{AUTH_MESSAGES.forbidden}</Alert>
      <Button component={Link} to={returnPath} replace onClick={onDismiss}>Return to {returnLabel}</Button>
      <Button onClick={authSession.logout}>Log out</Button>
    </Box>
  );
}
