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
  getPendingApprovals,
  processApproval,
  getStaff,
  createStaff,
  updateStaffStatus,
  getAnalytics,
} from '../controllers/deptHeadController.js';
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
 * @route  POST /api/v1/dept-head/approvals/:id
 * @desc   Authorize estimate or request contractor revision
 * @body   { action: 'APPROVE' | 'REQUEST_REVISION', notes?: string }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.post(
  '/approvals/:id',
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
// 3. Department Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/dept-head/analytics
 * @desc   Department expenditure, total tickets, and contractor telemetry
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
router.get(
  '/analytics',
  authenticate,
  requireRole(...DEPT_HEAD_ROLES),
  getAnalytics
);

export default router;
