import express from 'express';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { createOrganization, listOrganizations } from '../controllers/organization.controller.js';
import { validate } from '../middleware/validate.js';
import { createOrganizationSchema } from '../validation/organization.schemas.js';

const router = express.Router();

router.get('/', authRequired, listOrganizations);
router.post(
	'/',
	authRequired,
	requireRoles(['admin', 'organization_head'], 'Only admin or organization head users can create organizations'),
	validate(createOrganizationSchema),
	createOrganization
);

export default router;
