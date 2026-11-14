import * as signalR from '@microsoft/signalr';
import { authSession } from '../auth/session.js';
import { isChatMessage } from './chatMessages.js';

export const CHAT_HUB_URL = 'https://chatsystem.runasp.net/hubs/chat';

function buildConnection(accessTokenFactory) {
  return new signalR.HubConnectionBuilder()
    .withUrl(CHAT_HUB_URL, { accessTokenFactory })
    .withAutomaticReconnect()
    // Transport errors may contain URLs with credentials; show safe UI errors.
    .configureLogging(signalR.LogLevel.None)
    .build();
}

export function createChatService({ store = authSession, createConnection = buildConnection } = {}) {
  const consumers = new Set();
  const listeners = new Set();
  let entry = null;
  let status = 'Disconnected';
  let unsubscribeAuth;
  let stopping = Promise.resolve();

  function publish(nextStatus) {
    if (status === nextStatus) return;
    status = nextStatus;
    listeners.forEach(listener => listener());
  }

  function isCurrent(candidate) {
    return entry === candidate && consumers.size > 0 &&
      ['Patient', 'Doctor'].includes(store.getValidSession()?.role) && store.getSnapshot().version === candidate.version;
  }

  function dispose() {
    const old = entry;
    entry = null;
    publish('Disconnected');
    if (!old) return;
    old.connection.off('ReceiveMessage', old.receive);
    old.connection.off('MessagesRead', old.read);
    const stop = old.connection.stop().catch(() => {});
    // Wait for a pending negotiation to settle before starting a new session.
    stopping = Promise.all([stopping, stop, old.startPromise?.catch(() => {})]).then(() => undefined);
  }

  async function start(candidate) {
    if (!isCurrent(candidate)) throw new Error('Your chat session has ended.');
    if (candidate.startPromise) return candidate.startPromise;
    if (candidate.connection.state === signalR.HubConnectionState.Connected) return;
    if (candidate.connection.state !== signalR.HubConnectionState.Disconnected) return;
    publish('Connecting');
    const previousStop = stopping;
    candidate.startPromise = (async () => {
      await previousStop;
      try {
        if (!isCurrent(candidate)) return;
        await candidate.connection.start();
        if (isCurrent(candidate)) publish('Connected');
      } catch {
        if (isCurrent(candidate)) publish('Disconnected');
        throw new Error('Unable to connect to chat. Please try again.');
      } finally {
        candidate.startPromise = null;
      }
    })();
    return candidate.startPromise;
  }

  function syncSession() {
    const session = store.getValidSession();
    const { version } = store.getSnapshot();
    if (!consumers.size || !['Patient', 'Doctor'].includes(session?.role)) {
      dispose();
      return;
    }
    if (entry?.version === version) return;
    dispose();
    const candidate = { version, startPromise: null, readRequests: new Map() };
    candidate.connection = createConnection(() => {
      if (!isCurrent(candidate)) throw new Error('Your chat session has ended.');
      return store.getValidSession().token;
    });
    candidate.receive = message => {
      if (isCurrent(candidate) && isChatMessage(message)) {
        consumers.forEach(consumer => consumer.onMessage?.(message));
      }
    };
    candidate.read = receipt => {
      if (!isCurrent(candidate) || !Number.isSafeInteger(receipt?.chatId) || receipt.chatId <= 0 ||
          typeof receipt.readAt !== 'string' || !Number.isFinite(Date.parse(receipt.readAt))) return;
      consumers.forEach(consumer => consumer.onMessagesRead?.(receipt));
    };
    entry = candidate;
    candidate.connection.on('ReceiveMessage', candidate.receive);
    candidate.connection.on('MessagesRead', candidate.read);
    candidate.connection.onreconnecting(() => {
      if (isCurrent(candidate)) publish('Reconnecting');
    });
    candidate.connection.onreconnected(() => {
      if (!isCurrent(candidate)) return;
      publish('Connected');
      consumers.forEach(consumer => consumer.onReconnected?.());
    });
    candidate.connection.onclose(() => {
      if (isCurrent(candidate)) publish('Disconnected');
    });
    start(candidate).catch(() => {});
  }

  function acquire(consumer) {
    consumers.add(consumer);
    if (!unsubscribeAuth) unsubscribeAuth = store.subscribe(syncSession);
    syncSession();
    return () => {
      consumers.delete(consumer);
      // StrictMode may immediately reattach the page after its cleanup.
      queueMicrotask(() => {
        if (consumers.size) return;
        unsubscribeAuth?.();
        unsubscribeAuth = undefined;
        dispose();
      });
    };
  }

  async function sendMessage(chatId, content) {
    const candidate = entry;
    if (!Number.isSafeInteger(chatId) || chatId <= 0 || typeof content !== 'string' || !content.trim()) {
      throw new Error('Select a conversation and enter a message.');
    }
    if (!candidate || !isCurrent(candidate) || status !== 'Connected') {
      throw new Error('Chat is disconnected. Please reconnect before sending.');
    }
    let saved;
    try {
      saved = await candidate.connection.invoke('SendMessage', chatId, content.trim());
    } catch {
      throw new Error('Unable to send your message. Please try again.');
    }
    if (!isCurrent(candidate)) throw new Error('Your chat session has ended.');
    if (!isChatMessage(saved) || saved.chatId !== chatId) {
      throw new Error('The server did not confirm this message. Please check the conversation before retrying.');
    }
    return saved;
  }

  async function markMessagesAsRead(chatId) {
    const candidate = entry;
    if (!Number.isSafeInteger(chatId) || chatId <= 0) throw new Error('Select a valid conversation.');
    if (!candidate || !isCurrent(candidate) || status !== 'Connected') {
      throw new Error('Chat is disconnected. Read status will synchronize after reconnecting.');
    }
    if (candidate.readRequests.has(chatId)) return candidate.readRequests.get(chatId);
    const request = (async () => {
      try {
        // Publish the shared promise before invoke, even if a transport throws synchronously.
        await Promise.resolve();
        if (!isCurrent(candidate) || candidate.connection.state !== signalR.HubConnectionState.Connected) {
          throw new Error('Chat is disconnected.');
        }
        await candidate.connection.invoke('MarkMessagesAsRead', chatId);
        if (!isCurrent(candidate)) throw new Error('Your chat session has ended.');
      } catch {
        throw new Error('Unable to update read status.');
      } finally {
        candidate.readRequests.delete(chatId);
      }
    })();
    candidate.readRequests.set(chatId, request);
    return request;
  }

  return {
    acquire,
    sendMessage,
    markMessagesAsRead,
    connectChat: () => entry ? start(entry) : Promise.reject(new Error('Your chat session has ended.')),
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => status,
  };
}

export const chatService = createChatService();
