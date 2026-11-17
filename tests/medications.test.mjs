import test from 'node:test';
import assert from 'node:assert/strict';
import { medicationSchema } from '../src/validations/medicationSchema.js';

const medication = { name: 'Synthetic medication', dosage: 'As prescribed', frequency: 'Per prescription' };

test('medication validation trims all prescription text without adding fields', async () => {
  const result = await medicationSchema.validate({
    name: ` ${medication.name} `,
    dosage: ` ${medication.dosage} `,
    frequency: ` ${medication.frequency} `,
  });
  assert.deepEqual(result, medication);
});

for (const field of ['name', 'dosage', 'frequency']) {
  test(`${field} rejects empty, missing, null, and excessive text`, async () => {
    for (const value of ['', '   ', undefined, null, 'x'.repeat(201)]) {
      await assert.rejects(medicationSchema.validate({ ...medication, [field]: value }));
    }
    assert.equal(await medicationSchema.isValid({ ...medication, [field]: 'x'.repeat(200) }), true);
  });
}
