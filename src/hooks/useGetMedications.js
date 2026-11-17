import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import useAuth from '../auth/useAuth.js';
import { authSession } from '../auth/session.js';

export default function useGetMedications() {
  const { session, version } = useAuth();

  return useQuery({
    queryKey: ['medications', version],
    enabled: session?.role === 'Patient',
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (authSession.getValidSession()?.role !== 'Patient' || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      const response = await api.get('/Medications/my', { signal });
      if (!authSession.getValidSession() || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Failed to load medications.');
      }
      if (!Array.isArray(response.data?.data)) {
        throw new Error('Failed to load medications. Please try again.');
      }
      return response.data.data;
    },
  });
}
