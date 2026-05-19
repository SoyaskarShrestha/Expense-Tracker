import { emailSchema, requiredText, strictObject } from './common.js';

export const signupSchema = {
  body: strictObject({
    name: requiredText('name'),
    email: emailSchema,
    password: requiredText('password'),
  }),
};

export const loginSchema = {
  body: strictObject({
    email: emailSchema,
    password: requiredText('password'),
  }),
};
