import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { authSession } from '../auth/session.js';

export default function useAddDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async doctorId => {
      if (authSession.getValidSession()?.role !== 'Patient') {
        throw new Error('Please sign in as a patient to add a doctor.');
      }
      if (!Number.isSafeInteger(doctorId) || doctorId <= 0) {
        throw new Error('Unable to identify the selected doctor.');
      }
      const response = await api.post(`/Patient/DoctorPatient/${doctorId}`);
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Failed to add doctor.');
      }
      return response.data;
    },
    retry: false,
    onMutate: () => ({ version: authSession.getSnapshot().version }),
    onSuccess: (_data, _variables, context) => {
      if (authSession.getSnapshot().version === context.version) {
        return queryClient.invalidateQueries({ queryKey: ['availableDoctors', context.version] });
      }
    },
  });
}
