import test from 'node:test';
import assert from 'node:assert/strict';
import { getChatUserId } from '../src/auth/jwt.js';
import { createChatService, CHAT_HUB_URL } from '../src/services/signalrService.js';
import { mergeMessages, markSentMessagesRead, mergeMessageHistory } from '../src/services/chatMessages.js';
import { chatKeys, getPatientChats, getChatMessages, getDoctorChats, getDoctorChatMessages } from '../src/api/chat.js';
import { createApiClient } from '../src/api/client.js';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { chatMessageSchema } from '../src/validations/chatSchema.js';
import { applyMessagesRead, cacheSavedChatMessage } from '../src/services/chatReadReceipts.js';

for (const role of ['Patient', 'Doctor']) {
  test(`${role}: receipt before a non-echoed send result resynchronizes the authoritative read flag`, async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const key = chatKeys.messages(1, 71, role);
    const saved = { id: 100, chatId: 71, senderId: 'a1234567-1234-5678-abcd-123456789abc', content: 'Synthetic pending send',
      createdAt: '2026-11-14T17:59:00Z', isRead: false };
    let fetches = 0;
    const observer = new QueryObserver(client, { queryKey: key, initialData: [], staleTime: Infinity,
      queryFn: async () => { fetches++; return [{ ...saved, isRead: true }]; } });
    const unsubscribe = observer.subscribe(() => {});
    try {
      const context = { version: 1, role, receiptRevision: 0 };
      applyMessagesRead(client, 1, role, saved.senderId, { chatId: 71, readAt: '2026-11-14T18:00:00Z' });
      await cacheSavedChatMessage(client, saved, context);
      assert.equal(client.getQueryData(key)[0].isRead, true);
      assert.equal(fetches, 1);
    } finally {
      unsubscribe(); client.clear();
    }
  });
}

test('repeated readAt still updates newly cached sent messages immutably', () => {
  const client = new QueryClient();
  const key = chatKeys.messages(1, 71);
  const receipt = { chatId: 71, readAt: '2026-11-14T18:00:00Z' };
  const userId = 'a1234567-1234-5678-abcd-123456789abc';
  applyMessagesRead(client, 1, 'Patient', userId, receipt);
  const sent = Object.freeze({ id: 100, chatId: 71, senderId: userId.toUpperCase(), content: 'Synthetic pending send',
    createdAt: '2026-11-14T17:59:00Z', isRead: false });
  client.setQueryData(key, [sent]);
  applyMessagesRead(client, 1, 'Patient', userId, receipt);
  assert.equal(client.getQueryData(key)[0].isRead, true);
  assert.equal(sent.isRead, false);
  client.clear();
});

for (const role of ['Patient', 'Doctor']) {
  test(`${role}: receipt updates the observed cache synchronously, preserving unrelated fields and caches`, () => {
    const client = new QueryClient();
    const userId = 'a1234567-1234-5678-abcd-123456789abc';
    const key = chatKeys.messages(10, 808, role);
    const otherRole = role === 'Patient' ? 'Doctor' : 'Patient';
    const sent = Object.freeze({ id: 200, chatId: 808, senderId: userId, content: 'Synthetic sent', createdAt: '2026-11-14T12:00:00Z', isRead: false });
    const received = Object.freeze({ ...sent, id: 201, senderId: 'b1234567-1234-5678-abcd-123456789abc' });
    client.setQueryData(key, [sent, received]);
    client.setQueryData(chatKeys.messages(10, 902, role), [sent]);
    client.setQueryData(chatKeys.messages(10, 808, otherRole), [sent]);
    const observer = new QueryObserver(client, { queryKey: key, enabled: false });
    const unsubscribe = observer.subscribe(() => {});
    const receipt = { chatId: 808, readAt: '2026-11-14T18:00:00Z' };
    applyMessagesRead(client, 10, role, userId, receipt);
    assert.equal(observer.getCurrentResult().data[0].isRead, true);
    assert.deepEqual(client.getQueryData(key)[0], { ...sent, isRead: true });
    assert.equal(client.getQueryData(key)[1], received);
    assert.equal(sent.isRead, false);
    assert.equal(client.getQueryData(chatKeys.messages(10, 902, role))[0].isRead, false);
    assert.equal(client.getQueryData(chatKeys.messages(10, 808, otherRole))[0].isRead, false);
    const updated = client.getQueryData(key);
    applyMessagesRead(client, 10, role, userId, receipt);
    assert.equal(client.getQueryData(key), updated);
    unsubscribe(); client.clear();
  });
}

test('a send without a new receipt stays unread and does not invent a refetch or read flag', async () => {
  const client = new QueryClient();
  const saved = { id: 100, chatId: 71, senderId: 'a1234567-1234-5678-abcd-123456789abc', content: 'Synthetic new send',
    createdAt: '2026-11-14T17:59:00Z', isRead: false };
  applyMessagesRead(client, 1, 'Patient', saved.senderId, { chatId: 71, readAt: '2026-11-14T18:00:00Z' });
  const revision = client.getQueryData(chatKeys.receipts(1, 71))?.revision;
  let fetches = 0;
  const observer = new QueryObserver(client, { queryKey: chatKeys.messages(1, 71), initialData: [], staleTime: Infinity,
    queryFn: async () => { fetches++; return []; } });
  const unsubscribe = observer.subscribe(() => {});
  await cacheSavedChatMessage(client, saved, { version: 1, role: 'Patient', receiptRevision: revision });
  assert.equal(client.getQueryData(chatKeys.messages(1, 71))[0].isRead, false);
  assert.equal(fetches, 0);
  unsubscribe(); client.clear();
});

test('message form rejects empty content and trims surrounding whitespace', async () => {
  for (const content of ['', ' \n\t ', null, undefined]) {
    await assert.rejects(chatMessageSchema.validate({ content }));
  }
  assert.deepEqual(await chatMessageSchema.validate({ content: '  Hello\nthere  ' }), { content: 'Hello\nthere' });
});

const accountId = 'A1234567-1234-5678-ABCD-123456789ABC';
const identityClaim = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const message = (id, chatId = 71, createdAt = '2026-11-13T10:30:00Z') => ({
  id, chatId, senderId: accountId, content: `Synthetic ${id}`, createdAt, isRead: false,
});
const flush = () => new Promise(resolve => setImmediate(resolve));
function jwt(claims) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ role: 'Patient', exp: Date.now() / 1000 + 600, ...claims })}.c2ln`;
}

test('chat ownership uses only the confirmed account GUID claim, safely handling invalid tokens', () => {
  assert.equal(getChatUserId(jwt({ [identityClaim]: accountId })), accountId.toLowerCase());
  assert.equal(getChatUserId(jwt({ role: 'Doctor', [identityClaim]: accountId })), accountId.toLowerCase());
  for (const token of [null, 'invalid', jwt({ patientId: accountId, sub: accountId }), jwt({ [identityClaim]: 5 }),
    jwt({ [identityClaim]: 'not-a-guid' }), jwt({ [identityClaim]: accountId, exp: 1 })]) {
    assert.equal(getChatUserId(token), null);
  }
});

function harness({ initialSession = { role: 'Patient', token: 'synthetic-session' }, failStart = false } = {}) {
  let snapshot = { session: initialSession, version: 1 };
  const subscribers = new Set();
  const connections = [];
  const store = {
    getValidSession: () => snapshot.session,
    getSnapshot: () => snapshot,
    subscribe: callback => { subscribers.add(callback); return () => subscribers.delete(callback); },
    setSession(session) {
      snapshot = { session, version: snapshot.version + 1 };
      subscribers.forEach(callback => callback());
    },
  };
  const service = createChatService({ store, createConnection: accessTokenFactory => {
    const connection = {
      state: 'Disconnected', starts: 0, stops: 0, failStart, handlers: new Map(),
      accessTokenFactory, calls: [],
      on(event, callback) { this.handlers.set(event, callback); },
      off(event, callback) { if (this.handlers.get(event) === callback) this.handlers.delete(event); },
      onreconnecting(callback) { this.reconnecting = callback; },
      onreconnected(callback) { this.reconnected = callback; },
      onclose(callback) { this.closed = callback; },
      async start() {
        this.starts++;
        assert.ok(this.handlers.has('ReceiveMessage') && this.handlers.has('MessagesRead'), 'both listeners registered before start');
        assert.ok(this.accessTokenFactory());
        this.state = 'Connecting';
        if (this.failStart) { this.failStart = false; this.state = 'Disconnected'; throw new Error('Synthetic start failure'); }
        this.state = 'Connected';
      },
      async stop() { this.stops++; this.state = 'Disconnected'; this.closed?.(); },
      async invoke(...args) {
        this.calls.push(args);
        if (args[0] === 'MarkMessagesAsRead') return undefined;
        if (this.failSend) throw new Error('Synthetic send failure');
        const saved = { ...message(101, args[1]), content: args[2] };
        this.handlers.get('ReceiveMessage')?.(saved);
        return saved;
      },
    };
    connections.push(connection);
    return connection;
  } });
  return { service, store, connections, subscribers };
}

test('the exact hub URL is configured; missing and Admin sessions cannot connect', () => {
  assert.equal(CHAT_HUB_URL, 'https://chatsystem.runasp.net/hubs/chat');
  for (const initialSession of [null, { role: 'Admin', token: 'synthetic' }]) {
    const { service, connections } = harness({ initialSession });
    const release = service.acquire({});
    assert.equal(connections.length, 0);
    assert.equal(service.getSnapshot(), 'Disconnected');
    release();
  }
});

test('Doctor uses the same SignalR service, dynamic chat ID, lifecycle, and token factory', async () => {
  const { service, connections } = harness({ initialSession: { role: 'Doctor', token: 'synthetic-doctor-session' } });
  const received = [];
  let reconnected = 0;
  const release = service.acquire({ onMessage: saved => received.push(saved), onReconnected: () => reconnected++ });
  await service.connectChat();
  assert.equal(connections[0].accessTokenFactory(), 'synthetic-doctor-session');
  await service.sendMessage(808, ' Doctor reply ');
  assert.deepEqual(connections[0].calls, [['SendMessage', 808, 'Doctor reply']]);
  assert.equal(received[0].chatId, 808);
  connections[0].state = 'Reconnecting';
  connections[0].reconnecting();
  await assert.rejects(service.sendMessage(808, 'offline reply'));
  connections[0].state = 'Connected';
  connections[0].reconnected();
  assert.equal(reconnected, 1);
  release();
  await flush();
  assert.equal(connections[0].stops, 1);
});

test('Doctor REST APIs use bearer auth and each selected chat ID; response arrays may be empty', async () => {
  const client = createApiClient('https://example.invalid/api', {
    getValidSession: () => ({ role: 'Doctor', token: 'synthetic-doctor-session' }),
    getSnapshot: () => ({ version: 10 }), handleHttpError() {},
  });
  const requests = [];
  client.defaults.adapter = async config => {
    assert.equal(config.method, 'get');
    assert.equal(config.headers.get('Authorization'), 'Bearer synthetic-doctor-session');
    requests.push(config.url);
    return { status: 200, data: { success: true, data: [] }, config };
  };
  assert.deepEqual(await getDoctorChats({}, client), []);
  assert.deepEqual(await getDoctorChatMessages(301, {}, client), []);
  assert.deepEqual(await getDoctorChatMessages(808, {}, client), []);
  assert.deepEqual(requests, ['/Doctor/Chat', '/Doctor/Chat/301/Messages', '/Doctor/Chat/808/Messages']);
  await assert.rejects(getDoctorChatMessages(null, {}, client));
});

test('Patient/Doctor query keys isolate even identical session and chat IDs', () => {
  assert.deepEqual(chatKeys.chats(10), ['patientChats', 10]);
  assert.deepEqual(chatKeys.messages(10, 301), ['chatMessages', 10, 301]);
  assert.deepEqual(chatKeys.chats(10, 'Doctor'), ['doctorChats', 10]);
  assert.deepEqual(chatKeys.messages(10, 301, 'Doctor'), ['doctorChatMessages', 10, 301]);
  assert.notDeepEqual(chatKeys.messageScope(10), chatKeys.messageScope(10, 'Doctor'));
});

test('switching Patient to Doctor stops the old hub and rejects old-session events', async () => {
  const { service, connections, store } = harness();
  const received = [];
  const release = service.acquire({ onMessage: saved => received.push(saved) });
  await service.connectChat();
  const oldReceive = connections[0].handlers.get('ReceiveMessage');
  store.setSession({ role: 'Doctor', token: 'synthetic-doctor-session' });
  await service.connectChat();
  assert.equal(connections[0].stops, 1);
  oldReceive(message(20));
  assert.equal(received.length, 0);
  assert.equal(connections[1].accessTokenFactory(), 'synthetic-doctor-session');
  release();
  await flush();
});

test('consumers share one start/listener; releasing one does not stop another; last release cleans up', async () => {
  const { service, connections, subscribers } = harness();
  const releaseA = service.acquire({});
  const releaseB = service.acquire({});
  await Promise.all([service.connectChat(), service.connectChat()]);
  assert.equal(connections.length, 1);
  assert.equal(connections[0].starts, 1);
  assert.equal(connections[0].handlers.size, 2);
  releaseA();
  await flush();
  assert.equal(connections[0].stops, 0);
  releaseB();
  await flush();
  assert.equal(connections[0].stops, 1);
  assert.equal(connections[0].handlers.size, 0);
  assert.equal(subscribers.size, 0);
});

test('StrictMode cleanup/reattach does not start duplicate connections', async () => {
  const { service, connections } = harness();
  const release = service.acquire({});
  release();
  const releaseAgain = service.acquire({});
  await service.connectChat();
  await flush();
  assert.equal(connections.length, 1);
  assert.equal(connections[0].starts, 1);
  releaseAgain();
  await flush();
});

test('sending invokes only SendMessage with the dynamic chat ID and trimmed content', async () => {
  const { service, connections } = harness();
  const received = [];
  const release = service.acquire({ onMessage: saved => received.push(saved) });
  await service.connectChat();
  const saved = await service.sendMessage(902, '  Synthetic hello  ');
  assert.deepEqual(connections[0].calls, [['SendMessage', 902, 'Synthetic hello']]);
  assert.equal(saved.chatId, 902);
  assert.equal(mergeMessages(received, [saved]).length, 1);
  for (const [chatId, content] of [[0, 'Hello'], [902, '   ']]) {
    await assert.rejects(service.sendMessage(chatId, content));
  }
  connections[0].failSend = true;
  await assert.rejects(service.sendMessage(902, 'Retain this draft'), /Unable to send/);
  release();
  await flush();
});

test('reconnection status disables sending and notifies consumers to recover history', async () => {
  const { service, connections } = harness();
  let recovered = 0;
  const release = service.acquire({ onReconnected: () => recovered++ });
  await service.connectChat();
  connections[0].state = 'Reconnecting';
  connections[0].reconnecting();
  assert.equal(service.getSnapshot(), 'Reconnecting');
  await assert.rejects(service.sendMessage(71, 'Hello'), /disconnected/);
  connections[0].state = 'Connected';
  connections[0].reconnected();
  assert.equal(service.getSnapshot(), 'Connected');
  assert.equal(recovered, 1);
  connections[0].state = 'Disconnected';
  connections[0].closed();
  assert.equal(service.getSnapshot(), 'Disconnected');
  await service.connectChat();
  assert.equal(connections[0].starts, 2);
  release();
  await flush();
});

test('initial connection failures allow manual retry without exposing raw transport errors', async () => {
  const { service, connections } = harness({ failStart: true });
  const release = service.acquire({});
  await assert.rejects(service.connectChat(), /Unable to connect/);
  assert.equal(service.getSnapshot(), 'Disconnected');
  await service.connectChat();
  assert.equal(connections[0].starts, 2);
  release();
  await flush();
});

test('logout/account switching stops old connections and blocks old listeners and token factories', async () => {
  const { service, store, connections } = harness();
  const received = [];
  const release = service.acquire({ onMessage: saved => received.push(saved) });
  await service.connectChat();
  const old = connections[0];
  const oldListener = old.handlers.get('ReceiveMessage');
  store.setSession(null);
  assert.equal(old.stops, 1);
  oldListener(message(1));
  assert.equal(received.length, 0);
  assert.throws(() => old.accessTokenFactory(), /session has ended/);
  store.setSession({ role: 'Patient', token: 'synthetic-new-session' });
  await service.connectChat();
  assert.equal(connections.length, 2);
  assert.equal(connections[1].accessTokenFactory(), 'synthetic-new-session');
  oldListener(message(2));
  assert.equal(received.length, 0);
  connections[1].handlers.get('ReceiveMessage')(message(3));
  assert.equal(received.length, 1);
  release();
  await flush();
});

test('logout before negotiation starts prevents an orphaned connection from starting', async () => {
  const { service, store, connections } = harness();
  const release = service.acquire({});
  store.setSession(null);
  await flush();
  assert.equal(connections[0].starts, 0);
  assert.equal(connections[0].stops, 1);
  assert.equal(service.getSnapshot(), 'Disconnected');
  release();
  await flush();
});

test('a SendMessage result from an ended session cannot enter the next account cache', async () => {
  const { service, store, connections } = harness();
  const release = service.acquire({});
  await service.connectChat();
  let finish;
  connections[0].invoke = () => new Promise(resolve => { finish = resolve; });
  const pending = service.sendMessage(71, 'Synthetic pending send');
  store.setSession({ role: 'Patient', token: 'synthetic-other-account' });
  finish(message(101));
  await assert.rejects(pending, /session has ended/);
  await service.connectChat();
  release();
  await flush();
});

test('REST helpers unwrap arrays, allow empty history, and use the selected chat ID', async () => {
  const requests = [];
  const client = { async get(path) { requests.push(path); return { data: { success: true, data: [] } }; } };
  assert.deepEqual(await getPatientChats({}, client), []);
  assert.deepEqual(await getChatMessages(902, {}, client), []);
  assert.deepEqual(requests, ['/Patient/Chat', '/Patient/Chat/902/Messages']);
  await assert.rejects(getChatMessages(null, {}, client));
  await assert.rejects(getPatientChats({}, { async get() { return { data: { success: false } }; } }));
});

test('REST history merges with newer events, deduplicates, orders, and isolates conversations/sessions', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let finish;
  const key = chatKeys.messages(1, 71);
  const fetch = client.fetchQuery({ queryKey: key, queryFn: async () => {
    const history = await new Promise(resolve => { finish = resolve; });
    return mergeMessages(history, client.getQueryData(key));
  } });
  const live = message(3, 71, '2026-11-13T10:31:00Z');
  client.setQueryData(key, [live]);
  client.setQueryData(chatKeys.messages(1, 902), [message(4, 902)]);
  finish([message(1), message(2), live]);
  await fetch;
  assert.deepEqual(client.getQueryData(key).map(item => item.id), [1, 2, 3]);
  assert.equal(client.getQueryData(chatKeys.messages(1, 902))[0].chatId, 902);
  assert.equal(client.getQueryData(chatKeys.messages(2, 71)), undefined);
  client.clear();
});

for (const role of ['Patient', 'Doctor']) {
  test(`${role}: MarkMessagesAsRead uses a numeric dynamic chat ID and shares concurrent calls`, async () => {
    const { service, connections } = harness({ initialSession: { role, token: 'synthetic-session' } });
    const release = service.acquire({});
    await service.connectChat();
    await Promise.all([service.markMessagesAsRead(808), service.markMessagesAsRead(808)]);
    assert.deepEqual(connections[0].calls, [['MarkMessagesAsRead', 808]]);
    await assert.rejects(service.markMessagesAsRead('808'));
    await assert.rejects(service.markMessagesAsRead(0));
    connections[0].state = 'Reconnecting';
    connections[0].reconnecting();
    await assert.rejects(service.markMessagesAsRead(808));
    assert.equal(connections[0].calls.length, 1);
    release();
    await flush();
  });
}

test('read-status errors remain retryable and do not prevent sending', async () => {
  const { service, connections } = harness();
  const release = service.acquire({});
  await service.connectChat();
  const invoke = connections[0].invoke;
  connections[0].invoke = () => { throw new Error('Synthetic transport error'); };
  await assert.rejects(service.markMessagesAsRead(71), /Unable to update read status/);
  connections[0].invoke = invoke;
  await service.markMessagesAsRead(71);
  await service.sendMessage(71, 'Still able to send');
  release();
  await flush();
});

test('MessagesRead validates its payload and rejects callbacks from an ended session', async () => {
  const { service, store, connections } = harness();
  const receipts = [];
  const release = service.acquire({ onMessagesRead: receipt => receipts.push(receipt) });
  await service.connectChat();
  const receive = connections[0].handlers.get('MessagesRead');
  for (const invalid of [null, {}, { chatId: '71', readAt: '2026-11-14T18:00:00Z' }, { chatId: 71, readAt: 'invalid' }]) receive(invalid);
  assert.equal(receipts.length, 0);
  receive({ chatId: 71, readAt: '2026-11-14T18:00:00Z' });
  assert.equal(receipts.length, 1);
  store.setSession(null);
  assert.equal(connections[0].handlers.size, 0);
  receive({ chatId: 71, readAt: '2026-11-14T18:01:00Z' });
  assert.equal(receipts.length, 1);
  release();
  await flush();
});

test('a receipt changes only matching sent messages and repeated updates retain array identity', () => {
  const sent = message(1);
  const received = { ...message(2), senderId: 'b1234567-1234-5678-abcd-123456789abc' };
  const otherChat = message(3, 902);
  const messages = [sent, received, otherChat];
  const updated = markSentMessagesRead(messages, 71, accountId.toLowerCase());
  assert.deepEqual(updated[0], { ...sent, isRead: true });
  assert.equal(updated[1], received);
  assert.equal(updated[2], otherChat);
  assert.equal(markSentMessagesRead(updated, 71, accountId), updated);
  assert.equal(markSentMessagesRead(messages, 71, null), messages);
});

test('a read receipt survives stale history, duplicate echoes, and a delayed send acknowledgement', () => {
  const read = { ...message(1), isRead: true };
  assert.equal(mergeMessages([read], [message(1)])[0].isRead, true);
  assert.equal(mergeMessages([message(1)], [read])[0].isRead, true);
});

test('a receipt during history loading marks that snapshot without marking later cached sends', () => {
  const received = { ...message(2), senderId: 'b1234567-1234-5678-abcd-123456789abc' };
  const laterSend = message(3);
  const merged = mergeMessageHistory([message(1), received, laterSend], [laterSend], 71, accountId, true);
  assert.equal(merged.find(item => item.id === 1).isRead, true);
  assert.equal(merged.find(item => item.id === 2).isRead, false);
  assert.equal(merged.find(item => item.id === 3).isRead, false);
  assert.equal(mergeMessageHistory([message(1)], [], 71, accountId, false)[0].isRead, false);
});
