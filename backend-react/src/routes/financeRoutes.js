/**
 * TIMS Finance & AMC Reconciliation Routes (Member 5)
 * Strict 1-entry / 1-exit role-based endpoints
 */

import { Router } from 'express';
import financeController from '../controllers/financeController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Protect all finance endpoints: strictly FINANCE_CLERK and TOWNSHIP_COO
router.use(authenticate);
router.use(authorize('FINANCE_CLERK', 'TOWNSHIP_COO'));

// Invoices & 3-Way Reconciliation
router.get('/invoices', financeController.getInvoices);
router.get('/invoices/:id', financeController.getInvoiceById);
router.get('/invoices/:id/3-way-check', financeController.runThreeWayCheck);
router.post('/invoices/:id/authorize', financeController.authorizeInvoice);
router.post('/invoices/:id/flag-variance', financeController.flagVariance);
router.post('/invoices/:id/pay', financeController.releasePayment);

// Rate Cards Master Reference
router.get('/rate-cards', financeController.getRateCards);

// Financial Metrics & Telemetry
router.get('/analytics', financeController.getFinanceAnalytics);

export default router;
