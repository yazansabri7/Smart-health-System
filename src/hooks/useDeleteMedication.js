import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { authSession } from '../auth/session.js';

export default function useDeleteMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async medicationId => {
      if (authSession.getValidSession()?.role !== 'Patient') {
        throw new Error('Please sign in as a patient to delete medication.');
      }
      if (!Number.isSafeInteger(medicationId) || medicationId <= 0) {
        throw new Error('Unable to identify the selected medication.');
      }
      // No request body or response body is needed.
      await api.delete(`/Medications/my/${medicationId}`);
    },
    retry: false,
    onMutate: () => ({ version: authSession.getSnapshot().version }),
    onSuccess: (_data, _variables, context) => {
      if (authSession.getSnapshot().version === context.version) {
        return queryClient.invalidateQueries({ queryKey: ['medications', context.version] });
      }
    },
  });
}
