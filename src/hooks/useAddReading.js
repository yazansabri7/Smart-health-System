import { useMutation } from '@tanstack/react-query';
import { addReading } from '../api/readings.js';

export default function useAddReading() {
  return useMutation({ mutationFn: data => addReading(data), retry: false });
}
