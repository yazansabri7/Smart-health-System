import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addReading } from '../api/readings.js';
import { authSession } from '../auth/session.js';

export default function useAddReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: data => addReading(data),
    retry: false,
    onMutate: () => ({ version: authSession.getSnapshot().version }),
    onSuccess: (_data, _variables, context) => {
      if (authSession.getSnapshot().version === context.version) {
        return queryClient.invalidateQueries({ queryKey: ['myReadings', context.version] });
      }
    },
  });
}
