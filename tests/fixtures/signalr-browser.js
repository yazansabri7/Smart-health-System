// Served only by the browser test's request interceptor, never by application code.
export const HubConnectionState = {
  Disconnected: 'Disconnected', Connecting: 'Connecting', Connected: 'Connected', Reconnecting: 'Reconnecting',
};
export const LogLevel = { None: 6 };
const connections = [];
const controls = {
  starts: 0, stops: 0, calls: [], readCalls: [], failRead: false, failSend: false, nextId: 1000, tokenPresent: false,
  senderId: 'a1234567-1234-5678-abcd-123456789abc',
  receiptBeforeAck: false, serverMessages: [],
  emit(message) { connections.filter(connection => connection.state === 'Connected').forEach(connection => connection.receive?.(message)); },
  receipt(data) { connections.filter(connection => connection.state === 'Connected').forEach(connection => connection.read?.(data)); },
  disconnect() {
    connections.filter(connection => connection.state === 'Connected').forEach(connection => {
      connection.state = 'Reconnecting'; connection.reconnecting?.();
    });
  },
  reconnect() {
    connections.filter(connection => connection.state === 'Reconnecting').forEach(connection => {
      connection.state = 'Connected'; connection.reconnected?.();
    });
  },
};
window.__chatTest = controls;

export class HubConnectionBuilder {
  withUrl(url, options) { this.url = url; this.options = options; return this; }
  withAutomaticReconnect() { this.automaticReconnect = true; return this; }
  configureLogging() { return this; }
  build() {
    controls.hubUrl = this.url;
    controls.automaticReconnect = this.automaticReconnect;
    const options = this.options;
    const connection = {
      state: 'Disconnected',
      on(event, callback) {
        if (event === 'ReceiveMessage') this.receive = callback;
        if (event === 'MessagesRead') this.read = callback;
      },
      off(event, callback) {
        if (event === 'ReceiveMessage' && this.receive === callback) this.receive = undefined;
        if (event === 'MessagesRead' && this.read === callback) this.read = undefined;
      },
      onreconnecting(callback) { this.reconnecting = callback; },
      onreconnected(callback) { this.reconnected = callback; },
      onclose(callback) { this.closed = callback; },
      async start() {
        controls.starts++;
        controls.tokenPresent = Boolean(options.accessTokenFactory());
        this.state = 'Connected';
      },
      async stop() { controls.stops++; this.state = 'Disconnected'; this.closed?.(); },
      async invoke(method, chatId, content) {
        if (method === 'MarkMessagesAsRead') {
          controls.readCalls.push({ method, chatId });
          await new Promise(resolve => setTimeout(resolve, 100));
          if (controls.failRead) throw new Error('Synthetic read failure');
          return undefined;
        }
        controls.calls.push({ method, chatId, content });
        await new Promise(resolve => setTimeout(resolve, 150));
        if (controls.failSend) throw new Error('Synthetic send failure');
        const saved = { id: controls.nextId++, chatId, content,
          senderId: controls.senderId, createdAt: '2026-11-14T12:00:00Z', isRead: false };
        if (controls.receiptBeforeAck) {
          // Model a recipient reading before the sender receives its invoke result,
          // with no ReceiveMessage echo delivered to the sender.
          controls.serverMessages.push({ ...saved, isRead: true });
          this.read?.({ chatId, readAt: '2026-11-14T20:00:00Z' });
          await new Promise(resolve => setTimeout(resolve, 20));
          return saved;
        }
        this.receive?.(saved);
        this.receive?.(saved);
        return saved;
      },
    };
    connections.push(connection);
    return connection;
  }
}
