import { useMemo, useState } from 'react';
import {
  Box,
  Drawer,
  GlobalStyles,
  ThemeProvider,
  useMediaQuery,
} from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/navbar/Navbar';
import Sidebar from '../components/layout/Sidebar';
import useAuth from '../auth/useAuth.js';
import { authSession } from '../auth/session.js';
import { createDashboardTheme } from '../config/theme.js';

export default function DashboardLayout({ role, navigation }) {
  const { session } = useAuth();
  const user = session?.user;
  const onLogout = authSession.logout;
  const isDesktop = useMediaQuery('(min-width:768px)');
  const isWideScreen = useMediaQuery('(min-width:1200px)');
  const [expanded, setExpanded] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState(() => {
    try {
      if (localStorage.getItem('dashboard-color-mode') === 'dark') {
        return 'dark';
      }
      return 'light';
    } catch {
      return 'light';
    }
  });
  const location = useLocation();

  // Until the user toggles it, the sidebar follows the screen width.
  const collapsed = !(expanded ?? isWideScreen);
  const sidebarWidth = collapsed ? 80 : 264;

  // Keep the theme object stable when only the drawer or menu changes.
  const theme = useMemo(() => createDashboardTheme(mode), [mode]);

  const currentPage = navigation.find(item => {
    const isExactMatch = location.pathname === item.path;
    const isChildMatch = item.path !== navigation[0]?.path &&
      location.pathname.startsWith(`${item.path}/`);
    return isExactMatch || isChildMatch;
  });

  function handleToggleMode() {
    let nextMode = 'light';
    if (mode === 'light') {
      nextMode = 'dark';
    }
    setMode(nextMode);
    try {
      localStorage.setItem('dashboard-color-mode', nextMode);
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
  }

  function handleToggleSidebar() {
    if (isDesktop) {
      setExpanded(collapsed);
    } else {
      setMobileOpen(open => !open);
    }
  }

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={{
        body: { margin: 0 },
        '.material-symbols-outlined': {
          fontFamily: 'Material Symbols Outlined',
          fontWeight: 'normal',
          fontStyle: 'normal',
          display: 'inline-block',
          whiteSpace: 'nowrap',
          wordWrap: 'normal',
          direction: 'ltr',
          fontFeatureSettings: '"liga"',
          WebkitFontSmoothing: 'antialiased',
        },
      }} />
      <Box sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        color: 'text.primary',
        display: 'flex',
        width: '100%',
        '&, & *': { boxSizing: 'border-box' },
      }}>
        {isDesktop && (
          <Drawer
            variant="permanent"
            sx={{
              width: sidebarWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: sidebarWidth,
                transition: 'width 180ms ease',
                borderRight: 1,
                borderColor: 'divider',
              },
            }}
          >
            <Sidebar role={role} navigation={navigation} collapsed={collapsed} onLogout={onLogout} />
          </Drawer>
        )}
        {!isDesktop && (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={closeMobileSidebar}
            slotProps={{ paper: { sx: { width: 264, maxWidth: 'calc(100vw - 32px)' } } }}
          >
            <Sidebar
              role={role}
              navigation={navigation}
              collapsed={false}
              onNavigate={closeMobileSidebar}
              onLogout={onLogout}
            />
          </Drawer>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Navbar
            title={currentPage?.label || 'Dashboard'}
            role={role}
            user={user}
            navigation={navigation}
            mode={mode}
            onToggleMode={handleToggleMode}
            sidebarExpanded={isDesktop ? !collapsed : mobileOpen}
            onToggleSidebar={handleToggleSidebar}
            onLogout={onLogout}
          />
          <Box component="main" id="dashboard-content" sx={{
            p: { xs: 2, sm: 3, lg: 4 },
            width: '100%',
            maxWidth: 1600,
            mx: 'auto',
            overflowWrap: 'anywhere',
          }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
