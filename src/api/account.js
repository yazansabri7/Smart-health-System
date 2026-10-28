import { api } from './client.js';

export async function loginUser(data, client = api) {
  const response = await client.post('/Account/Login', data, { publicAuth: true });
  return response.data;
}

export async function registerPatient(data) {
  const response = await api.post('/Account/RegisterPatient', data);
  return response.data;
}

export async function registerDoctor(data) {
  const response = await api.post('/Account/RegisterDoctor', data);
  return response.data;
}

export async function sendCode(data) {
  const response = await api.post('/Account/SendCode', data);
  return response.data;
}

export async function resetPassword(data) {
  const response = await api.patch('/Account/ResetPassword', data);
  return response.data;
}
