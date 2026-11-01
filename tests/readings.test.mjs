import test from 'node:test';
import assert from 'node:assert/strict';
import { readingSchema } from '../src/validations/readingSchema.js';
import { addReading, getMyReadings, updateReading } from '../src/api/readings.js';

for (const [readingType, measurements] of [
  ['pressure', { systolic: 125, diastolic: 85 }],
  ['glucose', { glucoseLevel: 101.5 }],
  ['both', { systolic: 125, diastolic: 85, glucoseLevel: 101.5 }],
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
  ['glucose', { glucoseLevel: 100.5 }],
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
    for (const invalid of ['', ' ', 'abc', 0, -1, Infinity, NaN, undefined]) {
      await assert.rejects(readingSchema.validate({ readingType: 'both', systolic: 120, diastolic: 80, glucoseLevel: 100, [field]: invalid }));
    }
  }
  await assert.rejects(readingSchema.validate({ readingType: 'unknown' }));
});

test('API failures reject rather than reporting success', async () => {
  await assert.rejects(addReading({ readingType: 'glucose', glucoseLevel: 100 }, {
    async post() { return { data: { success: false } }; },
  }));
  await assert.rejects(addReading({ readingType: 'glucose', glucoseLevel: 100 }, {
    async post() { throw new Error('Synthetic network failure'); },
  }), /Synthetic network failure/);
});
