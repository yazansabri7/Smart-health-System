import * as yup from 'yup';

export const chatMessageSchema = yup.object({
  content: yup.string().trim().required('Enter a message.'),
});
