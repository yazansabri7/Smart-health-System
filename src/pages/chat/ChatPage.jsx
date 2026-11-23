import { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import useAuth from '../../auth/useAuth.js';
import useChats from '../../hooks/useChats.js';
import useChatConnection from '../../hooks/useChatConnection.js';
import { chatService } from '../../services/signalrService.js';
import ChatConversation from './ChatConversation.jsx';
import { getChatUserId } from '../../auth/jwt.js';

function ChatWorkspace({ currentUserId, role }) {
  const chats = useChats(role);
  const status = useChatConnection(role);
  const [selectedId, setSelectedId] = useState(null);
  const availableChats = (chats.data || []).filter(chat => Number.isSafeInteger(chat.id) && chat.id > 0);
  const selectedChat = availableChats.find(chat => chat.id === selectedId);
  const conversationTitle = chat => {
    const fullName = typeof chat.fullName === 'string' ? chat.fullName.trim() : '';
    return fullName || (role === 'Doctor' ? 'Patient' : 'Doctor');
  };

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">{role} workspace</Typography>
      <Typography component="h2" variant="h4" sx={{ fontWeight: 750, mt: 0.5, mb: 1, fontSize: { xs: 26, sm: 32 } }}>Messages</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {role === 'Doctor' ? 'Your conversations with your patients.' : 'Your conversations with your doctors.'}
      </Typography>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Typography component="h3" variant="h6">Conversations</Typography>
          <Chip size="small" variant="outlined" label={status} role="status" />
        </Stack>
        {status === 'Disconnected' && <Alert severity="warning" sx={{ mb: 2 }} action={
          <Button color="inherit" onClick={() => chatService.connectChat().catch(() => {})}>Reconnect</Button>
        }>Chat is disconnected. Reconnect to send messages.</Alert>}
        {chats.isPending ? <CircularProgress size={24} aria-label="Loading conversations" /> : chats.isError ? (
          <Alert severity="error" action={<Button color="inherit" onClick={() => chats.refetch()} disabled={chats.isFetching}>Try again</Button>}>
            Unable to load conversations. Please try again.
          </Alert>
        ) : availableChats.length === 0 ? (
          <Typography color="text.secondary">No conversations available yet.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '240px minmax(0, 1fr)' }, gap: 3 }}>
            <List aria-label="Conversations" sx={{ p: 0, maxHeight: { xs: 200, md: 540 }, overflowY: 'auto' }}>
              {availableChats.map(chat => (
                <ListItemButton key={chat.id} selected={chat.id === selectedId} onClick={() => setSelectedId(chat.id)}
                  sx={{ borderRadius: 2.5, mb: 1, '&.Mui-selected': { bgcolor: 'action.selected', color: 'primary.main' } }}>
                  <ListItemText primary={conversationTitle(chat)} slotProps={{ primary: { fontWeight: 600 } }} />
                </ListItemButton>
              ))}
            </List>
            {selectedChat ? (
              <ChatConversation key={selectedChat.id} chat={selectedChat} title={conversationTitle(selectedChat)}
                role={role} status={status} currentUserId={currentUserId} />
            ) : (
              <Typography color="text.secondary">Select a conversation to view messages.</Typography>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default function ChatPage({ role = 'Patient' }) {
  const { session, version } = useAuth();
  const currentUserId = useMemo(() => getChatUserId(session?.token), [session?.token]);
  return <ChatWorkspace key={`${role}-${version}`} currentUserId={currentUserId} role={role} />;
}
