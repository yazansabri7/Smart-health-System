import { AuthError, validateToken } from './jwt.js';

export function createSessionStore(options = {}) {
  const {
    queryClient,
    now = Date.now,
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
  } = options;

  let snapshot = Object.freeze({
    session: null,
    reason: null,
    forbidden: false,
    version: 0,
  });
  let expirationTimer;
  const listeners = new Set();

  function publish(changes) {
    // A new snapshot tells subscribed React components that auth changed.
    snapshot = Object.freeze({ ...snapshot, ...changes });
    for (const listener of listeners) {
      listener();
    }
  }

  function clear(reason = null) {
    clearTimeout(expirationTimer);
    try {
      storage?.removeItem('authToken');
    } catch {
      // A storage error must not prevent clearing the current session.
    }
    queryClient?.clear();
    publish({
      session: null,
      reason,
      forbidden: false,
      version: snapshot.version + 1,
    });
  }

  function scheduleExpiration() {
    clearTimeout(expirationTimer);
    if (!snapshot.session) {
      return;
    }

    const remaining = snapshot.session.expiresAt - now();
    if (remaining <= 0) {
      clear('expired');
      return;
    }

    // Browsers limit setTimeout to about 24 days; recheck longer-lived tokens.
    expirationTimer = setTimeout(scheduleExpiration, Math.min(remaining, 2147483647));
    expirationTimer.unref?.();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return function unsubscribe() {
      return listeners.delete(listener);
    };
  }

  function getSnapshot() {
    return snapshot;
  }

  function getValidSession() {
    if (snapshot.session && snapshot.session.expiresAt <= now()) {
      clear('expired');
    }
    return snapshot.session;
  }

  function beginLogin() {
    clear();
    return snapshot.version;
  }

  function establish(token, version) {
    // Ignore a response from a login attempt that ended or was replaced.
    if (version !== snapshot.version) {
      throw new AuthError('cancelled');
    }

    try {
      const session = validateToken(token, now());
      storage?.setItem('authToken', token);
      queryClient?.clear();
      publish({ session, reason: null, forbidden: false, version: snapshot.version + 1 });
      scheduleExpiration();
      return session;
    } catch (error) {
      clear(error.code || 'invalid_token');
      throw error;
    }
  }

  function failLogin(version, reason) {
    if (version === snapshot.version) {
      clear(reason);
    }
  }

  function handleHttpError(status, version) {
    if (version !== snapshot.version) {
      return;
    }
    if (status === 401) {
      clear('expired');
    } else if (status === 403 && snapshot.session) {
      publish({ forbidden: true });
    }
  }

  function dismissForbidden() {
    if (snapshot.forbidden) {
      publish({ forbidden: false });
    }
  }

  function restore() {
    try {
      const token = storage?.getItem('authToken');
      if (!token) {
        if (snapshot.session) {
          clear();
        }
        return;
      }

      const session = validateToken(token, now());
      queryClient?.clear();
      publish({ session, reason: null, forbidden: false, version: snapshot.version + 1 });
      scheduleExpiration();
    } catch (error) {
      clear(error.code || 'invalid_token');
    }
  }

  function logout() {
    clear('signed_out');
  }

  const store = {
    subscribe,
    getSnapshot,
    getValidSession,
    beginLogin,
    establish,
    failLogin,
    handleHttpError,
    dismissForbidden,
    restore,
    logout,
  };

  restore();
  return store;
}

export const authSession = createSessionStore();
