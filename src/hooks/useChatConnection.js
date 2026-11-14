import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatService } from '../services/signalrService.js';
import { mergeMessages } from '../services/chatMessages.js';
import { applyMessagesRead } from '../services/chatReadReceipts.js';
import { getChatUserId } from '../auth/jwt.js';
import { chatKeys } from '../api/chat.js';
import { authSession } from '../auth/session.js';
import useAuth from '../auth/useAuth.js';

export default function useChatConnection(role = 'Patient') {
  const queryClient = useQueryClient();
  const { session, version } = useAuth();
  const enabled = session?.role === role && ['Patient', 'Doctor'].includes(role);
  const currentUserId = useMemo(() => getChatUserId(session?.token), [session?.token]);
  const status = useSyncExternalStore(chatService.subscribe, chatService.getSnapshot, chatService.getSnapshot);
  useEffect(() => {
    if (!enabled) return;
    return chatService.acquire({
      onMessage: message => {
        if (authSession.getSnapshot().version !== version) return;
        queryClient.setQueryData(chatKeys.messages(version, message.chatId, role), old => mergeMessages(old, [message]));
        // An event for an unopened chat is not a substitute for its REST history.
        queryClient.invalidateQueries({ queryKey: chatKeys.messages(version, message.chatId, role), exact: true, refetchType: 'none' });
      },
      onReconnected: () => {
        if (authSession.getSnapshot().version !== version) return;
        queryClient.invalidateQueries({ queryKey: chatKeys.messageScope(version, role) });
        queryClient.invalidateQueries({ queryKey: chatKeys.chats(version, role) });
      },
      onMessagesRead: receipt => {
        if (!currentUserId || authSession.getSnapshot().version !== version) return;
        applyMessagesRead(queryClient, version, role, currentUserId, receipt);
      },
    });
  }, [enabled, version, role, queryClient, currentUserId]);
  return status;
}
