import { z } from 'zod';
import { emailSchema, requiredText, strictObject } from './common.js';

export const signupSchema = {
  body: strictObject({
    name: requiredText('name'),
    email: emailSchema,
    password: requiredText('password'),
    isOrgAccount: z.boolean().default(false).optional(),
    organizationName: z.string().trim().optional(),
    organizationDescription: z.string().trim().optional(),
  }),
};

export const loginSchema = {
  body: strictObject({
    email: emailSchema,
    password: requiredText('password'),
  }),
};
