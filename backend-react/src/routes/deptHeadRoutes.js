/**
 * deptHeadRoutes.js — TIMS Department Head API Routes (Member 4)
 *
 * Base path: /api/v1/dept-head
 *
 * Protected by JWT authentication and RBAC:
 * - Requires role DEPARTMENT_HEAD or TOWNSHIP_COO
 */

import express from 'express';
import {
  getStaff,
  createStaff,
  updateStaff,
  updateStaffStatus,
  getDashboard,
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
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

const DEPT_HEAD_ROLES = ['DEPARTMENT_HEAD', 'TOWNSHIP_COO'];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Estimate Approvals (> ₹10,000 threshold)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/approvals
 * @desc   Fetch pending contractor estimates requiring Dept Head authorization
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.get(
  '/approvals',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  getPendingApprovals
);

/**
 * @route  GET /api/v1/dept-head/approvals/:id
 * @desc   Fetch estimate details
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.get(
  '/approvals/:id',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  getApprovalDetails
);

/**
 * @route  POST /api/v1/dept-head/approvals/:id/decision
 * @desc   Authorize estimate or request contractor revision
 * @body   { action: 'APPROVE' | 'REQUEST_REVISION' | 'FORWARD_TO_COO', notes?: string }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.post(
  '/approvals/:id/decision',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  processApproval
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Department Staff Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/staff
 * @desc   List all Desk Clerks under the department
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.get(
  '/staff',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  getStaff
);

/**
 * @route  POST /api/v1/dept-head/staff
 * @desc   Create new Desk Clerk employee account (role locked to DESK_CLERK)
 * @body   { name, email, username, password, phone }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.post(
  '/staff',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  createStaff
);

/**
 * @route  PATCH /api/v1/dept-head/staff/:id
 * @desc   Update employee details
 * @body   { name, email, phone }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.patch(
  '/staff/:id',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  updateStaff
);

/**
 * @route  PATCH /api/v1/dept-head/staff/:id/status
 * @desc   Activate or Suspend employee access
 * @body   { status: 'ACTIVE' | 'SUSPENDED' }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.patch(
  '/staff/:id/status',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  updateStaffStatus
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Department Analytics / Dashboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/dashboard
 * @desc   Dashboard statistics
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.get(
  '/dashboard',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  getDashboard
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Work Order Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/work-orders
 * @desc   List and filter work orders
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.get(
  '/work-orders',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  getWorkOrders
);

/**
 * @route  GET /api/v1/dept-head/work-orders/:id
 * @desc   Work order details
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.get(
  '/work-orders/:id',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  getWorkOrderDetails
);

/**
 * @route  POST /api/v1/dept-head/work-orders/:id/escalate
 * @desc   Escalate delayed work
 * @body   { reason: string }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.post(
  '/work-orders/:id/escalate',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  escalateWorkOrder
);

export default router;
