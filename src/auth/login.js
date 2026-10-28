import { api } from '../api/client.js';
import { loginUser } from '../api/account.js';
import { AuthError, ROLE_HOME, tokenFromResponse } from './jwt.js';
import { authSession } from './session.js';

export function loginError(error) {
  if (error instanceof AuthError) {
    return error;
  }
  if (!error.response) {
    return new AuthError('network');
  }
  return backendLoginError(error.response.data);
}

export function backendLoginError(data) {
  let message = '';
  if (typeof data?.message === 'string') {
    message = data.message.trim().toLowerCase();
  }
  if (message === 'invalid email or password' || message === 'invalid email or password.') {
    return new AuthError('credentials');
  }
  if (message === 'account is locked out , please try again later' ||
      message === 'account is locked duo to multiple failed login attempts') {
    return new AuthError('locked');
  }
  if (message === 'email is not confirmed , please confirm your email') {
    return new AuthError('unconfirmed');
  }
  return new AuthError('failed');
}

export async function signIn(credentials, client = api, store = authSession) {
  const version = store.beginLogin();
  try {
    // Exactly one real request; no refresh, retry, alternate role, or mock path.
    const response = await loginUser(credentials, client);
    if (response?.success !== true) {
      throw backendLoginError(response);
    }
    const token = tokenFromResponse(response);
    const session = store.establish(token, version);
    return ROLE_HOME[session.role];
  } catch (error) {
    const safeError = loginError(error);
    store.failLogin(version, safeError.code);
    throw safeError;
  }
}
