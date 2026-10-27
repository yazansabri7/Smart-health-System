import { useSyncExternalStore } from 'react';
import { authSession } from './session.js';

export default function useAuth() {
  // Subscribe directly so every component sees the same current session.
  return useSyncExternalStore(authSession.subscribe, authSession.getSnapshot, authSession.getSnapshot);
}
