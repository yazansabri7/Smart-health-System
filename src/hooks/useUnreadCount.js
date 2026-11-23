import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import useAuth from '../auth/useAuth.js';
import { authSession } from '../auth/session.js';

export default function useUnreadCount() {
  const { session, version } = useAuth();
  return useQuery({
    queryKey: ['unreadCount', version],
    enabled: session?.role === 'Patient' || session?.role === 'Doctor',
    staleTime: 15000,
    refetchInterval: 30000,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!['Patient', 'Doctor'].includes(authSession.getValidSession()?.role) || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      const response = await api.get('/Notifications/unread-count', { signal });
      if (!authSession.getValidSession() || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      const count = response.data?.data;
      if (response.data?.success === false || !Number.isSafeInteger(count) || count < 0) {
        throw new Error('Unable to load unread notification count.');
      }
      return count;
    },
  });
}
