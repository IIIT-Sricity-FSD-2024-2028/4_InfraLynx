import express from 'express';
import {
  getContractors,
  getDepartments,
  getAmcRates,
  resetDatabase,
} from '../controllers/masterController.js';

const router = express.Router();

router.get('/contractors', getContractors);
router.get('/departments', getDepartments);
router.get('/amc-rates', getAmcRates);
router.post('/reset', resetDatabase);

export default router;
