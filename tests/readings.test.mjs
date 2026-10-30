import test from 'node:test';
import assert from 'node:assert/strict';
import { readingSchema } from '../src/validations/readingSchema.js';
import { addReading } from '../src/api/readings.js';

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
