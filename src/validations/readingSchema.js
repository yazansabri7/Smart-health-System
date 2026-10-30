import * as yup from 'yup';

function measurement(label, types) {
  return yup.number().transform((value, original) => {
    if (typeof original === 'string' && original.trim() === '') return undefined;
    return value;
  }).when('readingType', {
    is: type => types.includes(type),
    then: schema => schema
      .typeError(`${label} must be a number`)
      .required(`${label} is required`)
      .positive(`${label} must be greater than zero`)
      .test('finite', `${label} must be a finite number`, value => value == null || Number.isFinite(value)),
    otherwise: schema => schema.strip(),
  });
}

export const readingSchema = yup.object({
  readingType: yup.string().required('Select a reading type').oneOf(['pressure', 'glucose', 'both']),
  systolic: measurement('Systolic', ['pressure', 'both']),
  diastolic: measurement('Diastolic', ['pressure', 'both']),
  glucoseLevel: measurement('Blood glucose', ['glucose', 'both']),
});
