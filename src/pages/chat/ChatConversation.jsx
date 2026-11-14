import { useEffect, useRef } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import useChatMessages from '../../hooks/useChatMessages.js';
import useSendChatMessage from '../../hooks/useSendChatMessage.js';
import MaterialIcon from '../../components/layout/MaterialIcon.jsx';
import { chatMessageSchema } from '../../validations/chatSchema.js';
import useMarkChatRead from '../../hooks/useMarkChatRead.js';
import { isOwnMessage } from '../../services/chatMessages.js';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function ChatConversation({ chat, title, role = 'Patient', status, currentUserId }) {
  const messages = useChatMessages(chat.id, role);
  const send = useSendChatMessage(role);
  const readError = useMarkChatRead(chat.id, role, status, currentUserId);
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(chatMessageSchema), defaultValues: { content: '' }, mode: 'onChange',
  });
  const content = useWatch({ control, name: 'content' });
  const sending = useRef(false);
  const scrollArea = useRef(null);
  const followLatest = useRef(true);
  const connected = status === 'Connected';
  const pending = send.isPending || isSubmitting;

  useEffect(() => {
    if (followLatest.current && scrollArea.current) {
      scrollArea.current.scrollTop = scrollArea.current.scrollHeight;
    }
  }, [messages.data]);

  async function handleSend(data) {
    if (sending.current || !connected) return;
    sending.current = true;
    try {
      await send.mutateAsync({ chatId: chat.id, content: data.content });
      reset({ content: '' });
      followLatest.current = true;
      if (scrollArea.current) scrollArea.current.scrollTop = scrollArea.current.scrollHeight;
    } catch {
      // Keep the draft; never automatically retry a possibly delivered message.
    } finally {
      sending.current = false;
    }
  }

  return (
    <Stack spacing={2} sx={{ minWidth: 0, height: '100%' }}>
      <Typography component="h3" variant="h6">{title}</Typography>
      {messages.isError && <Alert severity="error" action={
        <Button color="inherit" disabled={messages.isFetching} onClick={() => messages.refetch()}>Try again</Button>
      }>Unable to load messages. Please try again.</Alert>}
      {messages.isFetching && <Typography variant="body2" color="text.secondary" role="status">Loading message history...</Typography>}
      <Box ref={scrollArea} role="log" aria-label="Conversation messages" aria-live="polite"
        onScroll={() => {
          const area = scrollArea.current;
          followLatest.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
        }}
        sx={{ flex: 1, minHeight: 240, height: { xs: 320, md: 420 }, overflowY: 'auto', p: 1 }}>
        {messages.isPending ? (
          <Stack direction="row" spacing={1.5} alignItems="center" role="status">
            <CircularProgress size={20} aria-label="Loading messages" />
            <Typography color="text.secondary">Loading messages...</Typography>
          </Stack>
        ) : !messages.isError && messages.data?.length === 0 ? (
          <Typography color="text.secondary">No messages yet.</Typography>
        ) : (
          <Stack spacing={2}>
            {(messages.data || []).filter(message => message.chatId === chat.id).map(message => {
              const mine = isOwnMessage(message, currentUserId);
              return (
                <Box key={message.id} sx={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '90%',
                  bgcolor: mine ? 'action.selected' : 'background.default', border: 1, borderColor: 'divider', p: 2, borderRadius: 3 }}>
                  {mine && <Typography variant="caption" color="text.secondary">You</Typography>}
                  <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.content}</Typography>
                  <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
                    {dateFormatter.format(new Date(message.createdAt))}
                    {mine && <Box component="span" role="img" aria-label={message.isRead === true ? 'Read' : 'Saved, not marked as read'}
                      sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 1 }}>
                      <MaterialIcon name={message.isRead === true ? 'done_all' : 'done'} sx={{ fontSize: 16 }} />
                    </Box>}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
      {send.isError && <Alert severity="error">{send.error.message}</Alert>}
      {readError && <Typography variant="caption" color="text.secondary" role="status">{readError}</Typography>}
      <Stack component="form" noValidate onSubmit={event => handleSubmit(handleSend)(event)} spacing={1.5}>
        <TextField label="Message" {...register('content')} error={!!errors.content} helperText={errors.content?.message}
          multiline minRows={2} fullWidth disabled={pending}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
        <Button type="submit" variant="contained" disabled={!connected || pending || !content.trim()}
          startIcon={pending ? <CircularProgress size={18} color="inherit" /> : <MaterialIcon name="send" />}
          sx={{ alignSelf: 'flex-end', minHeight: 44, borderRadius: 3 }}>
          {pending ? 'Sending...' : 'Send'}
        </Button>
      </Stack>
    </Stack>
  );
}
