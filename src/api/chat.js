import { api } from './client.js';

export const chatKeys = {
  chats: (version, role = 'Patient') => [role === 'Doctor' ? 'doctorChats' : 'patientChats', version],
  messageScope: (version, role = 'Patient') => [role === 'Doctor' ? 'doctorChatMessages' : 'chatMessages', version],
  messages: (version, chatId, role = 'Patient') => [...chatKeys.messageScope(version, role), chatId],
  receipts: (version, chatId, role = 'Patient') => ['chatReadReceipts', role, version, chatId],
};

function unwrap(response) {
  if (response.data?.success !== true || !Array.isArray(response.data.data)) {
    throw new Error('Unable to load your conversation. Please try again.');
  }
  return response.data.data;
}

export async function getPatientChats({ signal } = {}, client = api) {
  return unwrap(await client.get('/Patient/Chat', { signal }));
}

export async function getChatMessages(chatId, { signal } = {}, client = api) {
  if (!Number.isSafeInteger(chatId) || chatId <= 0) throw new Error('Select a valid conversation.');
  return unwrap(await client.get(`/Patient/Chat/${chatId}/Messages`, { signal }));
}

export async function getDoctorChats({ signal } = {}, client = api) {
  return unwrap(await client.get('/Doctor/Chat', { signal }));
}

export async function getDoctorChatMessages(chatId, { signal } = {}, client = api) {
  if (!Number.isSafeInteger(chatId) || chatId <= 0) throw new Error('Select a valid conversation.');
  return unwrap(await client.get(`/Doctor/Chat/${chatId}/Messages`, { signal }));
}
