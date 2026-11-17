import * as yup from 'yup';

export const medicationSchema = yup.object({
  name: yup.string().trim().required('Medication name is required.').max(200, 'Medication name must be 200 characters or fewer.'),
  dosage: yup.string().trim().required('Dosage is required.').max(200, 'Dosage must be 200 characters or fewer.'),
  frequency: yup.string().trim().required('Frequency is required.').max(200, 'Frequency must be 200 characters or fewer.'),
});
