import { useMemo, useState } from 'react';
import { Box, createTheme, Drawer, GlobalStyles, ThemeProvider, useMediaQuery } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/navbar/Navbar';
import Sidebar from '../components/layout/Sidebar';

export default function DashboardLayout({ role, navigation, user, onLogout }) {
  const desktop = useMediaQuery('(min-width:768px)');
  const wide = useMediaQuery('(min-width:1200px)');
  const [expanded, setExpanded] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('dashboard-color-mode') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const location = useLocation();
  const collapsed = !(expanded ?? wide);
  const width = collapsed ? 80 : 264;
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? '#005c55' : '#80cbc4', contrastText: mode === 'light' ? '#ffffff' : '#041b3c' },
      ...(mode === 'light' ? { background: { default: '#f9f9ff', paper: '#ffffff' }, text: { primary: '#041b3c', secondary: '#3e4947' }, action: { selected: '#cee5df' } } : {}),
    },
    typography: { fontFamily: "'Plus Jakarta Sans', sans-serif", button: { textTransform: 'none', fontWeight: 600 } },
    shape: { borderRadius: 12 },
  }), [mode]);
  const current = navigation.find(item => location.pathname === item.path || (item.path !== navigation[0]?.path && location.pathname.startsWith(`${item.path}/`)));
  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    try { localStorage.setItem('dashboard-color-mode', next); } catch { /* Storage may be unavailable. */ }
  };
  return <ThemeProvider theme={theme}>
    <GlobalStyles styles={{ body: { margin: 0 }, '.material-symbols-outlined': { fontFamily: 'Material Symbols Outlined', fontWeight: 'normal', fontStyle: 'normal', display: 'inline-block', whiteSpace: 'nowrap', wordWrap: 'normal', direction: 'ltr', fontFeatureSettings: '"liga"', WebkitFontSmoothing: 'antialiased' } }} />
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary', display: 'flex', width: '100%', '&, & *': { boxSizing: 'border-box' } }}>
      {desktop && <Drawer variant="permanent" sx={{ width, flexShrink: 0, '& .MuiDrawer-paper': { width, transition: 'width 180ms ease', borderRight: 1, borderColor: 'divider' } }}><Sidebar role={role} navigation={navigation} collapsed={collapsed} onLogout={onLogout} /></Drawer>}
      {!desktop && <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} slotProps={{ paper: { sx: { width: 264, maxWidth: 'calc(100vw - 32px)' } } }}><Sidebar role={role} navigation={navigation} collapsed={false} onNavigate={() => setMobileOpen(false)} onLogout={onLogout} /></Drawer>}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Navbar title={current?.label || 'Dashboard'} role={role} user={user} navigation={navigation} mode={mode} onToggleMode={toggleMode} sidebarExpanded={desktop ? !collapsed : mobileOpen} onToggleSidebar={() => desktop ? setExpanded(collapsed) : setMobileOpen(open => !open)} onLogout={onLogout} />
        <Box component="main" id="dashboard-content" sx={{ p: { xs: 2, sm: 3, lg: 4 }, width: '100%', maxWidth: 1600, mx: 'auto', overflowWrap: 'anywhere' }}><Outlet /></Box>
      </Box>
    </Box>
  </ThemeProvider>;
}
