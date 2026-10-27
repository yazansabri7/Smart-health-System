import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import MaterialIcon from '../layout/MaterialIcon';

export default function Navbar({
  title,
  role,
  user,
  onToggleSidebar,
  sidebarExpanded,
  mode,
  onToggleMode,
  navigation,
  onLogout,
}) {
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const displayName = user?.name || user?.username || `${role} account`;
  const profileLink = navigation.find(item => item.path.endsWith('/profile'));
  const nextMode = mode === 'light' ? 'dark' : 'light';
  const modeIcon = mode === 'light' ? 'dark_mode' : 'light_mode';

  function openProfileMenu(event) {
    setProfileAnchor(event.currentTarget);
  }

  function closeProfileMenu() {
    setProfileAnchor(null);
  }

  function openNotifications(event) {
    setNotificationAnchor(event.currentTarget);
  }

  function closeNotifications() {
    setNotificationAnchor(null);
  }

  function handleLogout() {
    closeProfileMenu();
    if (onLogout) {
      onLogout();
    }
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{ top: 0, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ gap: { xs: 0.5, sm: 1.5 }, minHeight: '72px !important', px: { xs: 1, sm: 3 } }}>
        <IconButton aria-label="Toggle sidebar" aria-expanded={sidebarExpanded} onClick={onToggleSidebar}>
          <MaterialIcon name="menu" />
        </IconButton>
        <Typography component="h1" noWrap sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 750, flex: 1, minWidth: 0 }}>
          {title}
        </Typography>
        <Tooltip title={`Switch to ${nextMode} mode`}>
          <IconButton aria-label={`Switch to ${nextMode} mode`} onClick={onToggleMode}>
            <MaterialIcon name={modeIcon} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Notifications">
          <IconButton
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-controls={notificationAnchor ? 'notification-menu' : undefined}
            onClick={openNotifications}
          >
            <MaterialIcon name="notifications" />
          </IconButton>
        </Tooltip>
        <Menu id="notification-menu" anchorEl={notificationAnchor} open={Boolean(notificationAnchor)} onClose={closeNotifications}>
          <MenuItem disabled>Notifications are not connected yet</MenuItem>
        </Menu>
        <Tooltip title="Account menu">
          <IconButton
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-controls={profileAnchor ? 'account-menu' : undefined}
            onClick={openProfileMenu}
            sx={{ p: 0.5 }}
          >
            <Avatar src={user?.avatarUrl} sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Box sx={{ display: { xs: 'none', md: 'block' }, maxWidth: 160 }}>
          <Typography noWrap variant="body2" fontWeight={700}>{displayName}</Typography>
          <Typography variant="caption" color="text.secondary">{role}</Typography>
        </Box>
        <Menu id="account-menu" anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={closeProfileMenu}>
          <MenuItem disabled>{displayName}</MenuItem>
          <Divider />
          {profileLink && (
            <MenuItem component={Link} to={profileLink.path} onClick={closeProfileMenu}>Profile</MenuItem>
          )}
          <MenuItem disabled={!onLogout} onClick={handleLogout}>Log out</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
