import { chatKeys } from '../api/chat.js';
import { markSentMessagesRead, mergeMessages } from './chatMessages.js';

export function applyMessagesRead(queryClient, version, role, userId, receipt) {
  if (!userId) return;
  const receiptKey = chatKeys.receipts(version, receipt.chatId, role);
  // readAt is neither a unique event ID nor a per-message cutoff. Record every
  // accepted arrival so an in-flight send can detect a receipt/acknowledgement race.
  queryClient.setQueryData(receiptKey, previous => ({ readAt: receipt.readAt, revision: (previous?.revision || 0) + 1 }));
  const key = chatKeys.messages(version, receipt.chatId, role);
  const previous = queryClient.getQueryData(key);
  const updated = markSentMessagesRead(previous, receipt.chatId, userId);
  if (updated !== previous) queryClient.setQueryData(key, updated);
}

export function cacheSavedChatMessage(queryClient, saved, context) {
  const key = chatKeys.messages(context.version, saved.chatId, context.role);
  queryClient.setQueryData(key, old => mergeMessages(old, [saved]));
  const revision = queryClient.getQueryData(chatKeys.receipts(context.version, saved.chatId, context.role))?.revision || 0;
  const alreadyRead = queryClient.getQueryData(key)?.some(message => String(message.id) === String(saved.id) && message.isRead === true);
  if (revision > context.receiptRevision && !alreadyRead) {
    // The receipt had no message ID to update before this send result arrived.
    // Ask the existing history endpoint for the authoritative flag rather than
    // guessing that the new message was covered by an earlier chat-wide receipt.
    return queryClient.invalidateQueries({ queryKey: key, exact: true });
  }
}
