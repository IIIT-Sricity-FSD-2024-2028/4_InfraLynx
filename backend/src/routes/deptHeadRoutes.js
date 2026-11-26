/**
 * deptHeadRoutes.js — TIMS Department Head API Routes (Member 4)
 *
 * Base path: /api/v1/dept-head
 *
 * Protected by JWT authentication and RBAC:
 * - Requires role DEPARTMENT_HEAD or TOWNSHIP_COO
 * - Strictly enforced: Department Head functionality is exclusive to Civil Department at this stage.
 */

import express from 'express';
import {
  getStaff,
  createStaff,
  updateStaff,
  updateStaffStatus,
  getDashboard,
  getDepartmentComplaints,
  getDepartmentComplaintById,
} from '../controllers/deptHeadController.js';
import {
  getPendingApprovals,
  getApprovalDetails,
  processApproval,
} from '../controllers/approvalController.js';
import {
  getWorkOrders,
  getWorkOrderDetails,
  escalateWorkOrder,
} from '../controllers/deptHeadWorkOrderController.js';
import { authenticate, requireRole, requireCivilDepartmentHead } from '../middleware/auth.js';

const router = express.Router();

const DEPT_HEAD_ROLES = ['DEPARTMENT_HEAD', 'TOWNSHIP_COO'];

// Apply authentication, RBAC, and Civil Department Head isolation to all routes
router.use(authenticate);
router.use(requireRole(...DEPT_HEAD_ROLES));
router.use(requireCivilDepartmentHead);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Estimate Approvals (> ₹10,000 threshold & AMC rate review)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/approvals
 * @desc   Fetch pending contractor estimates requiring Dept Head authorization
 */
router.get('/approvals', getPendingApprovals);

/**
 * @route  GET /api/v1/dept-head/approvals/:id
 * @desc   Fetch estimate details
 */
router.get('/approvals/:id', getApprovalDetails);

/**
 * @route  POST /api/v1/dept-head/approvals/:id
 * @route  POST /api/v1/dept-head/approvals/:id/decision
 * @desc   Authorize estimate or request contractor revision / reject
 * @body   { action: 'APPROVE' | 'REQUEST_REVISION' | 'FORWARD_TO_COO' | 'REJECT', notes?: string, rejection_reason?: string }
 */
router.post(['/approvals/:id', '/approvals/:id/decision'], processApproval);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Department Staff Management (Civil Department only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/staff
 * @desc   List all employees under Civil department
 */
router.get('/staff', getStaff);

/**
 * @route  POST /api/v1/dept-head/staff
 * @desc   Create new Desk Clerk employee account (role locked to DESK_CLERK)
 */
router.post('/staff', createStaff);

/**
 * @route  PATCH /api/v1/dept-head/staff/:id
 * @desc   Update employee details
 */
router.patch('/staff/:id', updateStaff);

/**
 * @route  PATCH /api/v1/dept-head/staff/:id/status
 * @desc   Activate or Suspend employee access
 */
router.patch('/staff/:id/status', updateStaffStatus);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Department Analytics / Dashboard (Civil Department only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/dashboard
 * @route  GET /api/v1/dept-head/analytics
 * @desc   Civil department dashboard metrics and activity
 */
router.get(['/dashboard', '/analytics'], getDashboard);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Work Order Management (Civil Department only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/work-orders
 * @desc   List and filter Civil work orders
 */
router.get('/work-orders', getWorkOrders);

/**
 * @route  GET /api/v1/dept-head/work-orders/:id
 * @desc   Civil work order details
 */
router.get('/work-orders/:id', getWorkOrderDetails);

/**
 * @route  POST /api/v1/dept-head/work-orders/:id/escalate
 * @desc   Escalate delayed Civil work order to Township COO
 */
router.post('/work-orders/:id/escalate', escalateWorkOrder);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Civil Department Complaints Management (All Statuses)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/complaints
 * @desc   Fetch all complaints belonging to Civil department across all statuses (pending, in-progress, rejected, resolved)
 */
router.get('/complaints', getDepartmentComplaints);

/**
 * @route  GET /api/v1/dept-head/complaints/:id
 * @desc   Fetch detailed Civil complaint record with complete description, location, history
 */
router.get('/complaints/:id', getDepartmentComplaintById);

export default router;

