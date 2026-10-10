/**
 * cooRoutes.js — TIMS Township COO (Chief Operating Officer) REST API Routes
 *
 * Enforces strict authentication and role authorization:
 * - Requires TOWNSHIP_COO role for all operational actions
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import cooController from '../controllers/cooController.js';

const router = Router();

// Protect all COO endpoints: strictly TOWNSHIP_COO
router.use(authenticate);
router.use(authorize('TOWNSHIP_COO'));

// 1. Dashboard APIs
router.get('/dashboard', cooController.getDashboard);

// 2. Department Management APIs
router.get('/departments', cooController.getDepartments);
router.post('/departments', cooController.createDepartment);
router.put('/departments/:id', cooController.updateDepartment);
router.patch('/departments/:id/status', cooController.updateDepartmentStatus);
router.patch('/departments/:id/head', cooController.assignDepartmentHead);

// 3. Department Head Management APIs
router.get('/department-heads', cooController.getDepartmentHeads);
router.post('/department-heads/:id/assign', cooController.assignDepartmentHead);
router.get('/departments/:id/staff', cooController.getDepartmentStaff);

// 4. Township Work Orders & Inspection Dossier
router.get('/work-orders', cooController.getTownshipWorkOrders);
router.get('/work-orders/:id', cooController.getWorkOrderDetails);
router.post('/work-orders/:id/escalate', cooController.escalateWorkOrder);

// 5. Estimate Approvals (Executive Joint Sign-Off)
router.get('/approvals', cooController.getPendingApprovals);
router.post('/approvals/:id', cooController.processApprovalDecision);

export default router;
