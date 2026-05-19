import express from 'express';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { createEmployee, deleteEmployee, listEmployees } from '../controllers/employee.controller.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, deleteEmployeeSchema } from '../validation/employee.schemas.js';

const router = express.Router();

router.get('/', authRequired, listEmployees);
router.post(
	'/',
	authRequired,
	requireRoles(['admin', 'organization_head'], 'Only admin or organization head users can add employees'),
	validate(createEmployeeSchema),
	createEmployee
);
router.delete(
	'/:id',
	authRequired,
	requireRoles(['admin', 'organization_head'], 'Only admin or organization head users can remove employees'),
	validate(deleteEmployeeSchema),
	deleteEmployee
);

export default router;
