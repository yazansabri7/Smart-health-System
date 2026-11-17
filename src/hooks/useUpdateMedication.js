import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { authSession } from '../auth/session.js';

export default function useUpdateMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ medicationId, values }) => {
      if (authSession.getValidSession()?.role !== 'Patient') {
        throw new Error('Please sign in as a patient to update medication.');
      }
      if (!Number.isSafeInteger(medicationId) || medicationId <= 0) {
        throw new Error('Unable to identify the selected medication.');
      }
      const { name, dosage, frequency } = values;
      const response = await api.patch(`/Medications/my/${medicationId}`, { name, dosage, frequency });
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Failed to update medication.');
      }
      return response.data;
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
