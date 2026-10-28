import { createTheme } from '@mui/material';

export function createDashboardTheme(mode) {
  const palette = {
    mode,
    primary: { main: '#80cbc4', contrastText: '#041b3c' },
  };
  if (mode === 'light') {
    palette.primary = { main: '#005c55', contrastText: '#ffffff' };
    palette.background = { default: '#f9f9ff', paper: '#ffffff' };
    palette.text = { primary: '#041b3c', secondary: '#3e4947' };
    palette.action = { selected: '#cee5df' };
  }
  return createTheme({
    palette,
    typography: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
  });
}
