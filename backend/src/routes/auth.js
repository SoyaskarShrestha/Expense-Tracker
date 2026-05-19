import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { login, me, signup } from '../controllers/auth.controller.js';
import { loginSchema, signupSchema } from '../validation/auth.schemas.js';

const router = express.Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', authRequired, me);

export default router;
