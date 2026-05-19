import { emailSchema, idParamsSchema, idSchema, requiredText, strictObject } from './common.js';

export const createEmployeeSchema = {
  body: strictObject({
    organizationId: idSchema,
    name: requiredText('name'),
    email: emailSchema,
    role: requiredText('role'),
  }),
};

export const deleteEmployeeSchema = {
  params: idParamsSchema,
};
