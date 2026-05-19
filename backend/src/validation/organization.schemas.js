import { idSchema, requiredText, strictObject } from './common.js';

export const createOrganizationSchema = {
  body: strictObject({
    name: requiredText('name'),
    description: requiredText('description'),
    headId: idSchema.optional(),
  }),
};
