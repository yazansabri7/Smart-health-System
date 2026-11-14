import test from 'node:test';
import assert from 'node:assert/strict';
import { readingSchema } from '../src/validations/readingSchema.js';
import { addReading, deleteReading, getMyReadings, updateReading } from '../src/api/readings.js';
import { createApiClient } from '../src/api/client.js';

test('DELETE uses dynamic reading IDs, sends no body, and does not read an empty response', async () => {
  for (const readingId of [7, 42, 91002]) {
    await deleteReading(readingId, {
      async delete(...args) {
        assert.deepEqual(args, [`/Readings/my/${readingId}`]);
        return { status: 204, get data() { throw new Error('DELETE must not inspect response JSON'); } };
      },
    });
  }
});

test('DELETE reuses bearer authentication and has no request payload', async () => {
  const client = createApiClient('https://example.invalid/api', {
    getValidSession: () => ({ token: 'synthetic-delete-token' }),
    getSnapshot: () => ({ version: 1 }),
    handleHttpError() {},
  });
  client.defaults.adapter = async config => {
    assert.equal(config.method, 'delete');
    assert.equal(client.getUri(config), 'https://example.invalid/api/Readings/my/42');
    assert.equal(config.headers.get('Authorization'), 'Bearer synthetic-delete-token');
    assert.equal(config.data, undefined);
    return { status: 204, data: '', config };
  };
  await deleteReading(42, client);
});

test('DELETE rejects invalid reading IDs without sending a request', async () => {
  let calls = 0;
  for (const readingId of [undefined, null, 0, -1, '../2', NaN]) {
    await assert.rejects(deleteReading(readingId, { async delete() { calls++; } }));
  }
  assert.equal(calls, 0);
});

test('DELETE preserves backend errors for the confirmation dialog', async () => {
  const error = { response: { status: 409, data: { message: 'Synthetic deletion error' } } };
  await assert.rejects(deleteReading(42, { async delete() { throw error; } }), received => received === error);
});

for (const [readingType, measurements] of [
  ['pressure', { systolic: 125, diastolic: 85 }],
  ['glucose', { glucoseLevel: 101 }],
  ['both', { systolic: 125, diastolic: 85, glucoseLevel: 101 }],
]) {
  test(`PATCH ${readingType}: uses the reading ID and omits unrelated fields and metadata`, async () => {
    let calls = 0;
    await updateReading({ readingId: 5, patientId: 999, readingType, systolic: 999, diastolic: 999, glucoseLevel: 999, ...measurements }, {
      async patch(path, body) {
        calls++;
        assert.equal(path, '/Readings/my/5');
        assert.deepEqual(body, measurements);
        return { data: { success: true } };
      },
    });
    assert.equal(calls, 1);
  });
}

test('PATCH rejects missing/invalid reading IDs without dispatching a request', async () => {
  let calls = 0;
  for (const readingId of [undefined, null, 0, -1, '../5', NaN]) {
    await assert.rejects(updateReading({ readingId, readingType: 'glucose', glucoseLevel: 100 }, {
      async patch() { calls++; },
    }));
  }
  assert.equal(calls, 0);
});

test('PATCH rejects business and HTTP failures and accepts a successful empty response', async () => {
  const input = { readingId: 5, readingType: 'glucose', glucoseLevel: 100 };
  await assert.rejects(updateReading(input, { async patch() { return { data: { success: false } }; } }));
  await assert.rejects(updateReading(input, { async patch() { throw new Error('Synthetic failure'); } }));
  assert.equal(await updateReading(input, { async patch() { return { data: '' }; } }), '');
});

test('GET my readings unwraps the confirmed response and passes cancellation without a patient ID', async () => {
  const data = [{ id: 5, patientId: 2, timestamp: '2026-10-30T22:23:09.9182648', bloodPressure: { systolic: 120, diastolic: 80 }, glucoseReading: null }];
  const { signal } = new AbortController();
  assert.deepEqual(await getMyReadings({ signal }, {
    async get(path, config) {
      assert.equal(path, '/Readings/my');
      assert.deepEqual(config, { signal });
      return { data: { success: true, data, errors: [], message: 'Readings retrieved successfully' } };
    },
  }), data);
});

test('GET my readings accepts an empty array and rejects failed or malformed responses', async () => {
  assert.deepEqual(await getMyReadings({}, { async get() { return { data: { success: true, data: [] } }; } }), []);
  for (const body of [{ success: false, data: [] }, { success: true, data: null }, { data: [] }]) {
    await assert.rejects(getMyReadings({}, { async get() { return { data: body }; } }));
  }
});

for (const [readingType, values] of [
  ['pressure', { systolic: 120, diastolic: 80 }],
  ['glucose', { glucoseLevel: 100 }],
  ['both', { systolic: 120, diastolic: 80, glucoseLevel: 100 }],
]) {
  test(`${readingType}: converts input numbers and posts only selected measurements`, async () => {
    const input = { readingType, systolic: '', diastolic: '', glucoseLevel: '' };
    for (const [key, value] of Object.entries(values)) input[key] = String(value);
    const validated = await readingSchema.validate(input);
    let calls = 0;
    await addReading(validated, { async post(path, body) {
      calls++;
      assert.equal(path, '/Readings');
      assert.deepEqual(body, values);
      return { data: {} };
    } });
    assert.equal(calls, 1);
  });
}

test('irrelevant stale measurements are stripped even when invalid', async () => {
  assert.deepEqual(await readingSchema.validate({ readingType: 'glucose', glucoseLevel: '100', systolic: 'bad', diastolic: 0 }), {
    readingType: 'glucose', glucoseLevel: 100,
  });
});

test('each selected measurement is required and must be finite and positive', async () => {
  for (const field of ['systolic', 'diastolic', 'glucoseLevel']) {
    for (const invalid of ['', ' ', 'abc', 0, -1, Infinity, -Infinity, NaN, undefined, null, 100.5]) {
      await assert.rejects(readingSchema.validate({ readingType: 'both', systolic: 120, diastolic: 80, glucoseLevel: 100, [field]: invalid }));
    }
  }
  await assert.rejects(readingSchema.validate({ readingType: 'unknown' }));
});

for (const [label, values] of [
  ['normal pressure', { readingType: 'pressure', systolic: 120, diastolic: 80 }],
  ['high pressure', { readingType: 'pressure', systolic: 250, diastolic: 150 }],
  ['low pressure', { readingType: 'pressure', systolic: 60, diastolic: 35 }],
  ['minimum pressure', { readingType: 'pressure', systolic: 50, diastolic: 30 }],
  ['maximum pressure', { readingType: 'pressure', systolic: 300, diastolic: 200 }],
  ['normal glucose', { readingType: 'glucose', glucoseLevel: 100 }],
  ['low glucose', { readingType: 'glucose', glucoseLevel: 20 }],
  ['high glucose', { readingType: 'glucose', glucoseLevel: 600 }],
  ['combined', { readingType: 'both', systolic: 250, diastolic: 150, glucoseLevel: 20 }],
]) {
  test(`input limits accept ${label} without clamping`, async () => {
    assert.deepEqual(await readingSchema.validate(values), values);
  });
}

for (const [field, invalidValues, expectedMessage] of [
  ['systolic', [49, 301], 'Systolic pressure must be between 50 and 300 mmHg.'],
  ['diastolic', [29, 201], 'Diastolic pressure must be between 30 and 200 mmHg.'],
  ['glucoseLevel', [19, 601], 'Blood glucose must be between 20 and 600 mg/dL.'],
]) {
  test(`${field} rejects values outside the configured input limits`, async () => {
    for (const value of invalidValues) {
      await assert.rejects(readingSchema.validate({ readingType: 'both', systolic: 120, diastolic: 80, glucoseLevel: 100, [field]: value }),
        error => error.path === field && error.message === expectedMessage);
    }
  });
}

test('pressure ordering errors belong to systolic for pressure-only and combined forms', async () => {
  for (const readingType of ['pressure', 'both']) {
    for (const systolic of [80, 79]) {
      await assert.rejects(readingSchema.validate({ readingType, systolic, diastolic: 80, glucoseLevel: 100 }),
        error => error.path === 'systolic' && error.message === 'Systolic pressure must be greater than diastolic pressure.');
    }
  }
});

test('unselected fields are stripped instead of validated or sent as placeholders', async () => {
  assert.deepEqual(await readingSchema.validate({ readingType: 'pressure', systolic: '120', diastolic: '80', glucoseLevel: 'invalid' }),
    { readingType: 'pressure', systolic: 120, diastolic: 80 });
  assert.deepEqual(await readingSchema.validate({ readingType: 'glucose', glucoseLevel: '20', systolic: null, diastolic: -5 }),
    { readingType: 'glucose', glucoseLevel: 20 });
});

test('API failures reject rather than reporting success', async () => {
  await assert.rejects(addReading({ readingType: 'glucose', glucoseLevel: 100 }, {
    async post() { return { data: { success: false } }; },
  }));
  await assert.rejects(addReading({ readingType: 'glucose', glucoseLevel: 100 }, {
    async post() { throw new Error('Synthetic network failure'); },
  }), /Synthetic network failure/);
});
