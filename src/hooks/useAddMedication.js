import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { authSession } from '../auth/session.js';

export default function useAddMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, dosage, frequency }) => {
      if (authSession.getValidSession()?.role !== 'Patient') {
        throw new Error('Please sign in as a patient to add medication.');
      }
      const response = await api.post('/Medications/my', { name, dosage, frequency });
      // Successful responses may have no body.
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Unable to save your medication. Please try again.');
      }
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
