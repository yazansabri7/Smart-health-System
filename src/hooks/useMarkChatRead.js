import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '../api/chat.js';
import { authSession } from '../auth/session.js';
import { chatService } from '../services/signalrService.js';
import { isOwnMessage } from '../services/chatMessages.js';
import useAuth from '../auth/useAuth.js';

export default function useMarkChatRead(chatId, role, status, currentUserId) {
  const queryClient = useQueryClient();
  const { version } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status !== 'Connected' || !currentUserId || !Number.isSafeInteger(chatId) || chatId <= 0) return;
    const key = chatKeys.messages(version, chatId, role);
    const seen = new Set();
    let disposed = false;
    let timer;
    let running = false;
    let dirty = false;

    function active() {
      return !disposed && document.visibilityState === 'visible' && document.hasFocus() &&
        authSession.getValidSession()?.role === role && authSession.getSnapshot().version === version;
    }

    async function mark() {
      if (!active()) return;
      if (running) { dirty = true; return; }
      running = true;
      try {
        await chatService.markMessagesAsRead(chatId);
        if (active()) setError(null);
      } catch {
        if (active()) setError('Read status could not be updated. Reopen the conversation or reconnect to retry.');
      } finally {
        running = false;
        if (dirty) { dirty = false; schedule(); }
      }
    }

    function schedule() {
      if (!active()) return;
      clearTimeout(timer);
      timer = setTimeout(mark, 150);
    }

    function inspect() {
      if (!active()) return;
      let incoming = false;
      for (const message of queryClient.getQueryData(key) || []) {
        if (message.chatId === chatId && typeof message.senderId === 'string' && message.senderId.trim() &&
            !isOwnMessage(message, currentUserId) && message.isRead !== true && !seen.has(String(message.id))) {
          seen.add(String(message.id));
          incoming = true;
        }
      }
      if (incoming) schedule();
    }

    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && JSON.stringify(event.query.queryKey) === JSON.stringify(key)) inspect();
    });
    function resume() { inspect(); schedule(); }
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    inspect();
    schedule();
    return () => {
      disposed = true;
      clearTimeout(timer);
      unsubscribe();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
    };
  }, [chatId, role, status, currentUserId, version, queryClient]);

  return error;
}
