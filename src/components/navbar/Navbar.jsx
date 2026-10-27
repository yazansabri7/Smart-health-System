import { useState } from 'react';
import { AppBar, Avatar, Box, Divider, IconButton, Menu, MenuItem, Toolbar, Tooltip, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import MaterialIcon from '../layout/MaterialIcon';

export default function Navbar({ title, role, user, onToggleSidebar, sidebarExpanded, mode, onToggleMode, navigation, onLogout }) {
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const name = user?.name || user?.username || `${role} account`;
  const profile = navigation.find(item => item.path.endsWith('/profile'));
  return <AppBar position="sticky" elevation={0} color="inherit" sx={{ top: 0, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
    <Toolbar sx={{ gap: { xs: 0.5, sm: 1.5 }, minHeight: '72px !important', px: { xs: 1, sm: 3 } }}>
      <IconButton aria-label="Toggle sidebar" aria-expanded={sidebarExpanded} onClick={onToggleSidebar}><MaterialIcon name="menu" /></IconButton>
      <Typography component="h1" noWrap sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 750, flex: 1, minWidth: 0 }}>{title}</Typography>
      <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}><IconButton aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`} onClick={onToggleMode}><MaterialIcon name={mode === 'light' ? 'dark_mode' : 'light_mode'} /></IconButton></Tooltip>
      <Tooltip title="Notifications"><IconButton aria-label="Notifications" aria-haspopup="menu" aria-controls={notificationAnchor ? 'notification-menu' : undefined} onClick={event => setNotificationAnchor(event.currentTarget)}><MaterialIcon name="notifications" /></IconButton></Tooltip>
      <Menu id="notification-menu" anchorEl={notificationAnchor} open={Boolean(notificationAnchor)} onClose={() => setNotificationAnchor(null)}>
        <MenuItem disabled>Notifications are not connected yet</MenuItem>
      </Menu>
      <Tooltip title="Account menu"><IconButton aria-label="Account menu" aria-haspopup="menu" aria-controls={profileAnchor ? 'account-menu' : undefined} onClick={event => setProfileAnchor(event.currentTarget)} sx={{ p: 0.5 }}><Avatar src={user?.avatarUrl} sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>{name.charAt(0).toUpperCase()}</Avatar></IconButton></Tooltip>
      <Box sx={{ display: { xs: 'none', md: 'block' }, maxWidth: 160 }}><Typography noWrap variant="body2" fontWeight={700}>{name}</Typography><Typography variant="caption" color="text.secondary">{role}</Typography></Box>
      <Menu id="account-menu" anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={() => setProfileAnchor(null)}>
        <MenuItem disabled>{name}</MenuItem><Divider />
        {profile && <MenuItem component={Link} to={profile.path} onClick={() => setProfileAnchor(null)}>Profile</MenuItem>}
        <MenuItem disabled={!onLogout} onClick={() => { setProfileAnchor(null); onLogout?.(); }}>Log out</MenuItem>
      </Menu>
    </Toolbar>
  </AppBar>;
}
