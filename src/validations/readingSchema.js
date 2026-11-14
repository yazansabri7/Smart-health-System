import * as yup from 'yup';

const systolicLimits = { min: 50, max: 300 };
const diastolicLimits = { min: 30, max: 200 };

// Product input limits, not diagnostic ranges or medical classifications.
function measurement(label, types, min, max, rangeMessage) {
  return yup.number().transform((value, original) => {
    if (typeof original === 'string' && original.trim() === '') return undefined;
    return value;
  }).when('readingType', {
    is: type => types.includes(type),
    then: schema => schema
      .typeError(`${label} must be a number`)
      .required(`${label} is required`)
      .integer(`${label} must be a whole number`)
      .min(min, rangeMessage)
      .max(max, rangeMessage)
      .test('finite', `${label} must be a finite number`, value => value == null || Number.isFinite(value)),
    otherwise: schema => schema.strip(),
  });
}

export const readingSchema = yup.object({
  readingType: yup.string().required('Select a reading type').oneOf(['pressure', 'glucose', 'both']),
  systolic: measurement('Systolic', ['pressure', 'both'], systolicLimits.min, systolicLimits.max,
    'Systolic pressure must be between 50 and 300 mmHg.').test(
    'pressure-order',
    'Systolic pressure must be greater than diastolic pressure.',
    function (value) {
      const { readingType, diastolic } = this.parent;
      if (readingType !== 'pressure' && readingType !== 'both') return true;
      // Show each field's input error before checking the relationship.
      if (!Number.isInteger(value) || !Number.isInteger(diastolic) ||
          value < systolicLimits.min || value > systolicLimits.max ||
          diastolic < diastolicLimits.min || diastolic > diastolicLimits.max) return true;
      return value > diastolic;
    },
  ),
  diastolic: measurement('Diastolic', ['pressure', 'both'], diastolicLimits.min, diastolicLimits.max,
    'Diastolic pressure must be between 30 and 200 mmHg.'),
  glucoseLevel: measurement('Blood glucose', ['glucose', 'both'], 20, 600,
    'Blood glucose must be between 20 and 600 mg/dL.'),
});
