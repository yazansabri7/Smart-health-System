import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { authSession } from '../auth/session.js';

export default function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async notificationId => {
      if (!['Patient', 'Doctor'].includes(authSession.getValidSession()?.role)) {
        throw new Error('Please sign in again.');
      }
      if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
        throw new Error('Unable to identify this notification.');
      }
      const response = await api.patch(`/Notifications/${notificationId}/read`);
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Unable to mark notification as read.');
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
