import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatKeys, getChatMessages, getDoctorChatMessages } from '../api/chat.js';
import { mergeMessageHistory } from '../services/chatMessages.js';
import { getChatUserId } from '../auth/jwt.js';
import { authSession } from '../auth/session.js';
import useAuth from '../auth/useAuth.js';

export default function useChatMessages(chatId, role = 'Patient') {
  const queryClient = useQueryClient();
  const { session, version } = useAuth();
  const queryKey = chatKeys.messages(version, chatId, role);
  return useQuery({
    queryKey,
    enabled: session?.role === role && ['Patient', 'Doctor'].includes(role) && Number.isSafeInteger(chatId) && chatId > 0,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (authSession.getValidSession()?.role !== role || authSession.getSnapshot().version !== version) throw new Error('Your session has ended.');
      const receiptKey = chatKeys.receipts(version, chatId, role);
      const revision = queryClient.getQueryData(receiptKey)?.revision || 0;
      const getMessages = role === 'Doctor' ? getDoctorChatMessages : getChatMessages;
      const history = await getMessages(chatId, { signal });
      if (!authSession.getValidSession() || authSession.getSnapshot().version !== version) throw new Error('Your session has changed.');
      // Preserve events that arrived while the REST request was pending.
      return mergeMessageHistory(history, queryClient.getQueryData(queryKey), chatId,
        getChatUserId(authSession.getValidSession().token), (queryClient.getQueryData(receiptKey)?.revision || 0) > revision);
    },
  });
}
