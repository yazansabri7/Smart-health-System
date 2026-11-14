export function isChatMessage(message) {
  return message != null && (typeof message.id === 'number' || typeof message.id === 'string') &&
    String(message.id).trim() !== '' && Number.isSafeInteger(message.chatId) && message.chatId > 0 &&
    typeof message.content === 'string' && typeof message.createdAt === 'string' &&
    Number.isFinite(Date.parse(message.createdAt));
}

export function mergeMessages(...lists) {
  const messages = new Map();
  for (const list of lists) {
    for (const message of list || []) {
      if (isChatMessage(message)) {
        const previous = messages.get(String(message.id));
        messages.set(String(message.id), previous?.isRead === true && message.isRead !== true
          ? { ...message, isRead: true } : message);
      }
    }
  }
  return [...messages.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
    String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}

export function isOwnMessage(message, userId) {
  return typeof userId === 'string' && typeof message?.senderId === 'string' &&
    message.senderId.toLowerCase() === userId.toLowerCase();
}

export function markSentMessagesRead(messages, chatId, userId, excludedIds = new Set()) {
  if (!messages) return messages;
  let changed = false;
  const updated = messages.map(message => {
    if (message.chatId !== chatId || !isOwnMessage(message, userId) ||
        message.isRead === true || excludedIds.has(String(message.id))) return message;
    changed = true;
    return { ...message, isRead: true };
  });
  return changed ? updated : messages;
}

export function mergeMessageHistory(history, cached, chatId, userId, receiptDuringFetch) {
  let incoming = history.filter(message => message?.chatId === chatId);
  if (receiptDuringFetch) {
    // Cached unread sends appearing after the event must not inherit an old receipt.
    const unreadIds = new Set((cached || []).filter(message => isOwnMessage(message, userId) && message.isRead !== true)
      .map(message => String(message.id)));
    incoming = markSentMessagesRead(incoming, chatId, userId, unreadIds);
  }
  return mergeMessages(incoming, cached);
}
