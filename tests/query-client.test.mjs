import test from 'node:test';
import assert from 'node:assert/strict';
import { onlineManager } from '@tanstack/react-query';
import { queryClient } from '../src/api/queryClient.js';
import { authSession } from '../src/auth/session.js';

function token(role) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url');
  return `${header}.${claims}.c2ln`;
}

test('the application session clears the real query cache on login and logout', () => {
  try {
    queryClient.setQueryData(['patient', 'readings'], ['previous user data']);
    const version = authSession.beginLogin();
    assert.equal(queryClient.getQueryData(['patient', 'readings']), undefined);
    queryClient.setQueryData(['old-user'], { name: 'Previous user' });
    authSession.establish(token('Patient'), version);
    assert.equal(queryClient.getQueryData(['old-user']), undefined);
    queryClient.setQueryData(['current-user'], { role: 'Patient' });
    authSession.logout();
    assert.equal(queryClient.getQueryData(['current-user']), undefined);
  } finally {
    authSession.logout();
  }
});

test('HTTP 403 keeps the same session and cache; HTTP 401 clears both', () => {
  try {
    authSession.establish(token('Doctor'), authSession.beginLogin());
    queryClient.setQueryData(['doctor', 'patients'], ['synthetic patient']);
    const version = authSession.getSnapshot().version;
    authSession.handleHttpError(403, version);
    assert.equal(authSession.getSnapshot().session.role, 'Doctor');
    assert.deepEqual(queryClient.getQueryData(['doctor', 'patients']), ['synthetic patient']);
    authSession.handleHttpError(401, version);
    assert.equal(authSession.getSnapshot().session, null);
    assert.equal(queryClient.getQueryData(['doctor', 'patients']), undefined);
  } finally {
    authSession.logout();
  }
});

test('write mutations fail once without retrying or queuing an offline login', async () => {
  let requests = 0;
  onlineManager.setOnline(false);
  const mutation = queryClient.getMutationCache().build(queryClient, {
    async mutationFn() {
      requests++;
      throw new Error('Synthetic connection failure');
    },
  });
  try {
    await assert.rejects(mutation.execute({ email: 'synthetic@example.invalid' }), /Synthetic connection failure/);
    assert.equal(requests, 1);
    assert.equal(mutation.state.status, 'error');
    assert.equal(mutation.state.isPaused, false);
  } finally {
    onlineManager.setOnline(true);
    queryClient.clear();
  }
});
