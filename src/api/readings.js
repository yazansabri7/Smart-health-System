import { api } from './client.js';

export async function getMyReadings({ signal } = {}, client = api) {
  const response = await client.get('/Readings/my', { signal });
  if (response.data?.success !== true || !Array.isArray(response.data.data)) {
    throw new Error('Unable to load your readings. Please try again.');
  }
  return response.data.data;
}

export async function updateReading({ readingId, readingType, systolic, diastolic, glucoseLevel }, client = api) {
  if (!Number.isSafeInteger(readingId) || readingId <= 0) {
    throw new Error('Unable to identify the selected reading.');
  }
  const data = {};
  if (readingType === 'pressure' || readingType === 'both') {
    data.systolic = systolic;
    data.diastolic = diastolic;
  }
  if (readingType === 'glucose' || readingType === 'both') {
    data.glucoseLevel = glucoseLevel;
  }
  // PATCH preserves omitted measurements according to the confirmed contract.
  const response = await client.patch(`/Readings/my/${readingId}`, data);
  if (response.data?.success === false) {
    throw new Error('Unable to update your reading. Please try again.');
  }
  return response.data;
}

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
