import express from 'express';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { getAdminPanelData } from '../controllers/admin.controller.js';

const router = express.Router();

router.get(
  '/panel',
  authRequired,
  requireRoles(['admin'], 'Only admin users can access the admin panel'),
  getAdminPanelData
);

export default router;
