import { amountSchema, idParamsSchema, idSchema, requiredText, strictObject } from './common.js';

export const createMoneyRequestSchema = {
  body: strictObject({
    organizationId: idSchema.optional(),
    employeeId: idSchema.optional(),
    amount: amountSchema,
    reason: requiredText('reason'),
  }),
};

export const updateMoneyRequestStatusSchema = {
  params: idParamsSchema,
  body: strictObject({
    status: requiredText('status').refine((value) => ['approved', 'rejected'].includes(value), {
      message: 'status must be approved or rejected',
    }),
    note: requiredText('note').optional(),
  }).refine((value) => value.status !== 'rejected' || !!value.note, {
    message: 'note is required when rejecting a request',
    path: ['note'],
  }),
};
