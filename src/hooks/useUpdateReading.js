import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateReading } from '../api/readings.js';
import { authSession } from '../auth/session.js';

export default function useUpdateReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: data => updateReading(data),
    retry: false,
    onMutate: () => ({ version: authSession.getSnapshot().version }),
    onSuccess: (_data, _variables, context) => {
      if (authSession.getSnapshot().version === context.version) {
        return queryClient.invalidateQueries({ queryKey: ['myReadings', context.version] });
      }
    },
  });
}
