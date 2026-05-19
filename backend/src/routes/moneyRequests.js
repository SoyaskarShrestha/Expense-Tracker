import express from 'express';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createMoneyRequest,
  listMoneyRequests,
  updateMoneyRequestStatus,
} from '../controllers/moneyRequest.controller.js';
import {
  createMoneyRequestSchema,
  updateMoneyRequestStatusSchema,
} from '../validation/moneyRequest.schemas.js';

const router = express.Router();

router.get('/', authRequired, listMoneyRequests);
router.post(
  '/',
  authRequired,
  requireRoles(
    ['admin', 'organization_head', 'employee'],
    'Only admin, organization head, or employee users can create money requests'
  ),
  validate(createMoneyRequestSchema),
  createMoneyRequest
);
router.patch(
  '/:id/status',
  authRequired,
  requireRoles(['admin', 'organization_head'], 'Only admin or organization head users can update request status'),
  validate(updateMoneyRequestStatusSchema),
  updateMoneyRequestStatus
);

export default router;
