import express from 'express';
import {
  getContractors,
  getDepartments,
  getAmcRates,
  resetDatabase,
} from '../controllers/masterController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/contractors', getContractors);
router.get('/departments', getDepartments);
router.get('/amc-rates', getAmcRates);
// Protected: Only Township COO can reset in-memory database via API
router.post('/reset', authenticate, requireRole('TOWNSHIP_COO'), resetDatabase);

export default router;
