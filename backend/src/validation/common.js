import { z } from 'zod';

export const strictObject = (shape) => z.object(shape).strict();

export const idSchema = z.string().trim().min(1, 'id is required');

export const requiredText = (fieldName) => z.string().trim().min(1, `${fieldName} is required`);

export const emailSchema = z
  .string()
  .trim()
  .email('email must be valid')
  .transform((value) => value.toLowerCase());

export const amountSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.trim() === '' ? Number.NaN : Number(value);
  }

  return Number(value);
}, z.number().finite('amount must be a valid number').positive('amount must be a positive number'));

export const recurrenceSchema = z.enum(['none', 'weekly', 'monthly', 'yearly'], {
  errorMap: () => ({ message: 'recurrence must be none, weekly, monthly, or yearly' }),
});

export const idParamsSchema = strictObject({
  id: idSchema,
});
