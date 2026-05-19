import { z } from 'zod';
import { amountSchema, idParamsSchema, recurrenceSchema, requiredText, strictObject } from './common.js';

const dateSchema = requiredText('date').refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'date must be a valid date',
});

const reminderDaysBeforeSchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    return value.trim() === '' ? Number.NaN : Number.parseInt(value, 10);
  }
  return Number(value);
}, z.number().int('reminderDaysBefore must be a whole number').min(0, 'reminderDaysBefore cannot be negative').max(30, 'reminderDaysBefore cannot exceed 30'));

const recurrenceFields = {
  recurrence: recurrenceSchema.default('none'),
  reminderEnabled: z.boolean().default(false),
  reminderDaysBefore: reminderDaysBeforeSchema.default(0),
};

function withReminderRules(schema) {
  return schema.refine(
    (value) => !value.reminderEnabled || value.reminderDaysBefore > 0,
    {
      message: 'reminderDaysBefore must be greater than 0 when reminders are enabled',
      path: ['reminderDaysBefore'],
    }
  );
}

export const createExpenseSchema = {
  body: withReminderRules(
    strictObject({
      category: requiredText('category'),
      amount: amountSchema,
      description: requiredText('description'),
      date: dateSchema,
      paymentMethod: requiredText('paymentMethod'),
      ...recurrenceFields,
    })
  ),
};

export const updateExpenseSchema = {
  params: idParamsSchema,
  body: withReminderRules(
    strictObject({
      category: requiredText('category').optional(),
      amount: amountSchema.optional(),
      description: requiredText('description').optional(),
      date: dateSchema.optional(),
      paymentMethod: requiredText('paymentMethod').optional(),
      recurrence: recurrenceSchema.optional(),
      reminderEnabled: z.boolean().optional(),
      reminderDaysBefore: reminderDaysBeforeSchema.optional(),
    })
  ).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  }),
};

export const expenseIdSchema = {
  params: idParamsSchema,
};
