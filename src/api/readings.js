import { api } from './client.js';

export async function addReading({ readingType, systolic, diastolic, glucoseLevel }, client = api) {
  // Keep the form independent of how the backend groups measurement endpoints.
  const data = {};
  if (readingType === 'pressure' || readingType === 'both') {
    data.systolic = systolic;
    data.diastolic = diastolic;
  }
  if (readingType === 'glucose' || readingType === 'both') {
    data.glucoseLevel = glucoseLevel;
  }
  const response = await client.post('/Readings', data);
  if (response.data?.success === false) {
    throw new Error('Unable to save your reading. Please try again.');
  }
  return response.data;
}
