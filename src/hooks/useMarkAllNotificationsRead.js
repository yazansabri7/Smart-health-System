import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { authSession } from '../auth/session.js';

export default function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!['Patient', 'Doctor'].includes(authSession.getValidSession()?.role)) {
        throw new Error('Please sign in again.');
      }
      const response = await api.patch('/Notifications/read-all');
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Unable to mark all notifications as read.');
      }
    },
    retry: false,
    onMutate: () => ({ version: authSession.getSnapshot().version }),
    onSuccess: (_data, _variables, context) => {
      if (authSession.getSnapshot().version === context.version) {
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: ['notifications', context.version] }),
          queryClient.invalidateQueries({ queryKey: ['unreadCount', context.version] }),
        ]);
      }
    },
  });
}
