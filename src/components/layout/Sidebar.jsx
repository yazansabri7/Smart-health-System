import {
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { NavLink } from 'react-router-dom';
import MaterialIcon from './MaterialIcon';

export default function Sidebar({ role, navigation, collapsed, onNavigate, onLogout }) {
  let logoutTooltip = '';
  if (!onLogout) {
    logoutTooltip = 'Logout is unavailable until authentication is connected';
  } else if (collapsed) {
    logoutTooltip = 'Log out';
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ height: 88, px: collapsed ? 2 : 3, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Box sx={{
          width: 40,
          height: 40,
          borderRadius: 3,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}>
          <MaterialIcon name="health_and_safety" />
        </Box>
        {!collapsed && (
          <Box>
            <Typography fontWeight={800} letterSpacing={-0.5}>SmartDHP</Typography>
            <Typography variant="caption" color="text.secondary">Digital healthcare</Typography>
          </Box>
        )}
      </Box>
      <Divider />
      {!collapsed && (
        <Typography variant="overline" color="text.secondary" sx={{ px: 3, pt: 2.5, pb: 1 }}>
          {role} workspace
        </Typography>
      )}
      <List
        component="nav"
        aria-label={`${role} navigation`}
        sx={{ p: 1.5, pt: collapsed ? 3 : 1, flex: 1, overflowY: 'auto' }}
      >
        {navigation.map(item => (
          <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
            <ListItemButton
              component={NavLink}
              to={item.path}
              end={item.path === navigation[0]?.path}
              onClick={onNavigate}
              aria-label={collapsed ? item.label : undefined}
              sx={{
                minHeight: 48,
                mb: 0.75,
                px: collapsed ? 1.75 : 2,
                borderRadius: 2.5,
                color: 'text.secondary',
                transition: 'background-color 160ms, color 160ms',
                '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
                '&.active': {
                  bgcolor: 'action.selected',
                  color: 'primary.main',
                  '& .MuiListItemText-primary': { fontWeight: 700 },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 38, color: 'inherit' }}>
                <MaterialIcon name={item.icon} />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText primary={item.label} slotProps={{ primary: { fontSize: 14, fontWeight: 500 } }} />
              )}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Tooltip title={logoutTooltip} placement="right">
          <Box>
            <Button
              disabled={!onLogout}
              onClick={onLogout}
              fullWidth
              aria-label="Log out"
              sx={{
                minWidth: 0,
                minHeight: 44,
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 1.5,
                px: 2,
                color: 'text.secondary',
              }}
            >
              <MaterialIcon name="logout" />
              {!collapsed && 'Log out'}
            </Button>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
