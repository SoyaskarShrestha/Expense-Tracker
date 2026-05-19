import { idParamsSchema, requiredText, strictObject } from './common.js';

export const updateUserRoleSchema = {
  params: idParamsSchema,
  body: strictObject({
    role: requiredText('role').refine((value) => ['user', 'employee', 'organization_head', 'admin'].includes(value), {
      message: 'role must be user, employee, organization_head, or admin',
    }),
  }),
};
