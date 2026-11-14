import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../services/signalrService.js';
import { cacheSavedChatMessage } from '../services/chatReadReceipts.js';
import { chatKeys } from '../api/chat.js';
import { authSession } from '../auth/session.js';

export default function useSendChatMessage(role = 'Patient') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, content }) => chatService.sendMessage(chatId, content),
    retry: false,
    onMutate: ({ chatId }) => {
      const { version } = authSession.getSnapshot();
      return { version, role, receiptRevision: queryClient.getQueryData(chatKeys.receipts(version, chatId, role))?.revision || 0 };
    },
    onSuccess: (saved, _variables, context) => {
      if (authSession.getSnapshot().version !== context.version) return;
      return cacheSavedChatMessage(queryClient, saved, context);
    },
  });
}
