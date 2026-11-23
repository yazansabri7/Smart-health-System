import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import useAuth from '../auth/useAuth.js';
import { authSession } from '../auth/session.js';

export default function useAvailableDoctors() {
  const { session, version } = useAuth();
  return useQuery({
    queryKey: ['availableDoctors', version],
    enabled: session?.role === 'Patient',
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (authSession.getValidSession()?.role !== 'Patient' || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      const response = await api.get('/Patient/Patient/AvailableDoctors', { signal });
      if (!authSession.getValidSession() || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      if (!Array.isArray(response.data)) {
        throw new Error('Unable to load available doctors. Please try again.');
      }
      return response.data;
    },
  });
}
