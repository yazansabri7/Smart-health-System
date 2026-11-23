import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import useAuth from '../auth/useAuth.js';
import { authSession } from '../auth/session.js';

export default function useNotifications(open) {
  const { session, version } = useAuth();
  return useQuery({
    queryKey: ['notifications', version],
    enabled: open && (session?.role === 'Patient' || session?.role === 'Doctor'),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const current = authSession.getValidSession();
      if (!['Patient', 'Doctor'].includes(current?.role) || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      const response = await api.get('/Notifications', { signal });
      if (!authSession.getValidSession() || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      if (response.data?.success === false || !Array.isArray(response.data?.data?.items)) {
        throw new Error('Unable to load notifications. Please try again.');
      }
      return response.data.data;
    },
  });
}
