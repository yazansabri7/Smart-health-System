import { useRef, useState } from 'react';
import { Alert, Badge, Box, Button, CircularProgress, Divider, IconButton, List, ListItem, ListItemButton, Popover, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import MaterialIcon from '../layout/MaterialIcon';
import useAuth from '../../auth/useAuth.js';
import useNotifications from '../../hooks/useNotifications.js';
import useUnreadCount from '../../hooks/useUnreadCount.js';
import useMarkNotificationRead from '../../hooks/useMarkNotificationRead.js';
import useMarkAllNotificationsRead from '../../hooks/useMarkAllNotificationsRead.js';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function NotificationBellContent() {
  const [anchor, setAnchor] = useState(null);
  const notifications = useNotifications(Boolean(anchor));
  const unread = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const submitting = useRef(false);
  const pending = markRead.isPending || markAll.isPending;
  const items = notifications.data?.items || [];
  const mutationError = markRead.error || markAll.error;
  const backendMessage = mutationError?.response?.data?.message || mutationError?.message;

  async function handleMarkRead(notification) {
    if (submitting.current || notification.isRead !== false) return;
    submitting.current = true;
    markRead.reset();
    markAll.reset();
    try {
      await markRead.mutateAsync(notification.id);
    } catch {
      // Preserve the list and show the error so the user can retry.
    } finally {
      submitting.current = false;
    }
  }

  async function handleMarkAll() {
    if (submitting.current || !(unread.data > 0)) return;
    submitting.current = true;
    markRead.reset();
    markAll.reset();
    try {
      await markAll.mutateAsync();
    } catch {
      // Failed mutations must not change read state.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton aria-label="Notifications" aria-haspopup="dialog" aria-expanded={Boolean(anchor)}
          aria-controls={anchor ? 'notification-menu' : undefined} sx={{ overflow: 'visible' }}
          onClick={event => {
            setAnchor(event.currentTarget);
            unread.refetch();
          }}>
          <Badge badgeContent={unread.data} color="error" overlap="circular"
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }} invisible={!(unread.data > 0)}
            sx={{ overflow: 'visible' }}>
            <MaterialIcon name="notifications" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover id="notification-menu" anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 400, maxWidth: 'calc(100vw - 32px)', borderRadius: 3, mt: 1 } } }}>
        <Box role="dialog" aria-labelledby="notifications-title">
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ p: 2 }}>
            <Typography id="notifications-title" component="h2" variant="h6">Notifications</Typography>
            <Button size="small" disabled={pending || !(unread.data > 0)} onClick={handleMarkAll}
              startIcon={markAll.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}>
              Mark all as read
            </Button>
          </Stack>
          <Divider />
          {unread.isError && <Alert severity="error" sx={{ m: 2 }} action={
            <Button color="inherit" disabled={unread.isFetching} onClick={() => unread.refetch()}>Retry</Button>
          }>Unable to load unread count.</Alert>}
          {mutationError && <Alert severity="error" sx={{ m: 2 }}>
            {typeof backendMessage === 'string' && backendMessage.trim() ? backendMessage : 'Unable to update notifications. Please try again.'}
          </Alert>}
          <Box sx={{ maxHeight: 420, overflowY: 'auto' }} aria-busy={notifications.isFetching || pending}>
            {notifications.isPending ? (
              <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} aria-label="Loading notifications" /></Box>
            ) : notifications.isError ? (
              <Alert severity="error" sx={{ m: 2 }} action={
                <Button color="inherit" disabled={notifications.isFetching} onClick={() => notifications.refetch()}>Retry</Button>
              }>Unable to load notifications. Please try again.</Alert>
            ) : items.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 3 }}>No notifications yet</Typography>
            ) : (
              <List disablePadding aria-label="Notifications">
                {items.map(notification => {
                  const date = new Date(notification.createdAt);
                  return (
                    <ListItem key={notification.id} disablePadding>
                      <ListItemButton onClick={() => handleMarkRead(notification)} disabled={pending}
                        aria-label={`${notification.isRead === false ? 'Unread: ' : ''}${notification.title}`}
                        sx={{ alignItems: 'flex-start', p: 2,
                          bgcolor: theme => notification.isRead === false ? alpha(theme.palette.error.main, 0.08) : undefined,
                          '&:hover': { bgcolor: theme => notification.isRead === false ? alpha(theme.palette.error.main, 0.12) : undefined },
                        }}>
                        <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: notification.isRead === false ? 700 : 500 }}>{notification.title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{notification.message}</Typography>
                          {!Number.isNaN(date.getTime()) && <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>{dateFormatter.format(date)}</Typography>}
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
          {notifications.data?.hasMore && <Typography variant="caption" color="text.secondary" component="p" sx={{ p: 2 }}>Showing the latest notifications.</Typography>}
        </Box>
      </Popover>
    </>
  );
}

export default function NotificationBell() {
  const { version } = useAuth();
  return <NotificationBellContent key={version} />;
}
