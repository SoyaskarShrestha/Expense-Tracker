import express from 'express';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { listUsers, updateUserRole } from '../controllers/user.controller.js';
import { validate } from '../middleware/validate.js';
import { updateUserRoleSchema } from '../validation/user.schemas.js';

const router = express.Router();

router.get(
	'/',
	authRequired,
	requireRoles(['admin'], 'Only admin users can view users'),
	listUsers
);
router.patch(
	'/:id/role',
	authRequired,
	requireRoles(['admin'], 'Only admin users can update user roles'),
	validate(updateUserRoleSchema),
	updateUserRole
);

export default router;
