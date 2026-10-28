import axios from 'axios';
import { authSession } from '../auth/session.js';

export function createApiClient(baseURL, store = authSession) {
  const api = axios.create({ baseURL, timeout: 15000 });

  function prepareRequest(config) {
    const session = store.getValidSession();
    config.sessionVersion = store.getSnapshot().version;

    // Never send this API's token to another origin or outside its base path.
    let baseAddress = baseURL;
    if (!baseAddress.endsWith('/')) {
      baseAddress += '/';
    }
    const base = new URL(baseAddress);
    const target = new URL(api.getUri(config), base);
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) {
      throw new Error('API URL is outside the configured API.');
    }

    if (session && !config.publicAuth) {
      config.headers.set('Authorization', `Bearer ${session.token}`);
    } else {
      config.headers.delete('Authorization');
    }
    return config;
  }

  function handleResponseError(error) {
    if (!error.config?.publicAuth) {
      store.handleHttpError(error.response?.status, error.config?.sessionVersion);
    }
    return Promise.reject(error);
  }

  api.interceptors.request.use(prepareRequest);
  api.interceptors.response.use(response => response, handleResponseError);
  return api;
}

export const api = createApiClient(import.meta.env?.VITE_BASE_URL || '');
