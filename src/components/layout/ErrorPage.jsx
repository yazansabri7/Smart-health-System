import { Box, Button, GlobalStyles, Paper, ThemeProvider, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { createDashboardTheme } from '../../config/theme.js';

export default function ErrorPage({ title, message, onGoToLogin }) {
  let mode = 'light';
  try {
    if (localStorage.getItem('dashboard-color-mode') === 'dark') {
      mode = 'dark';
    }
  } catch {
    // The page still renders if browser storage is unavailable.
  }

  return (
    <ThemeProvider theme={createDashboardTheme(mode)}>
      <GlobalStyles styles={{ body: { margin: 0 } }} />
      <Box component="main" sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        color: 'text.primary',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3,
        boxSizing: 'border-box',
      }}>
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, maxWidth: 600, width: '100%', borderRadius: 4, textAlign: 'center' }}>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 2 }}>{title}</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>{message}</Typography>
          <Button component={Link} to="/login" variant="contained" onClick={onGoToLogin}>Go to Login</Button>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
