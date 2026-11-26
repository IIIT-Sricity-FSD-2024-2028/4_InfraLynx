import express from 'express';
import {
  getContractors,
  getDepartments,
  getAmcRates,
  resetDatabase,
} from '../controllers/masterController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/contractors', getContractors);
router.get('/departments', getDepartments);
router.get('/amc-rates', getAmcRates);
// Protected: Only Township COO can refresh database state via API
router.post('/reset', requireRole('TOWNSHIP_COO'), resetDatabase);

export default router;
