import { useQuery } from '@tanstack/react-query';
import { chatKeys, getPatientChats, getDoctorChats } from '../api/chat.js';
import useAuth from '../auth/useAuth.js';
import { authSession } from '../auth/session.js';

export default function useChats(role = 'Patient') {
  const { session, version } = useAuth();
  return useQuery({
    queryKey: chatKeys.chats(version, role),
    enabled: session?.role === role && ['Patient', 'Doctor'].includes(role),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (authSession.getValidSession()?.role !== role || authSession.getSnapshot().version !== version) throw new Error('Your session has ended.');
      const getChats = role === 'Doctor' ? getDoctorChats : getPatientChats;
      const chats = await getChats({ signal });
      if (!authSession.getValidSession() || authSession.getSnapshot().version !== version) throw new Error('Your session has changed.');
      return chats;
    },
  });
}
