import { useQuery } from '@tanstack/react-query';
import { getMyReadings } from '../api/readings.js';
import useAuth from '../auth/useAuth.js';
import { authSession } from '../auth/session.js';

export default function useMyReadings() {
  const { session, version } = useAuth();

  return useQuery({
    queryKey: ['myReadings', version],
    enabled: session?.role === 'Patient',
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (authSession.getValidSession()?.role !== 'Patient' || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      const readings = await getMyReadings({ signal });
      if (!authSession.getValidSession() || authSession.getSnapshot().version !== version) {
        throw new Error('Your session has changed. Please sign in again.');
      }
      return readings;
    },
  });
}
