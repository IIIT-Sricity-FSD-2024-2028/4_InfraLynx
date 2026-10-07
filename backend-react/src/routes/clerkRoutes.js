/**
 * clerkRoutes.js — TIMS Desk Clerk API Routes (Member 2)
 *
 * Base path: /api/v1/clerk
 *
 * All routes require JWT authentication (authenticate middleware).
 * All action routes require role DESK_CLERK or TOWNSHIP_COO.
 *
 * Complaint Triage & Validation:
 *   PATCH  /api/v1/clerk/complaints/:id/triage    — open for review (REPORTED → UNDER_REVIEW)
 *   PATCH  /api/v1/clerk/complaints/:id/validate  — approve (UNDER_REVIEW → VALIDATED)
 *   PATCH  /api/v1/clerk/complaints/:id/reject    — reject  (UNDER_REVIEW → REJECTED)
 *
 * Work Orders:
 *   POST   /api/v1/clerk/work-orders              — create WO from validated complaint
 *   GET    /api/v1/clerk/work-orders              — list all WOs (supports ?status=&priority=)
 *   GET    /api/v1/clerk/work-orders/:id          — get single WO with complaint context
 */

import express from 'express';
import {
  triageComplaint,
  validateComplaint,
  rejectComplaint,
  createWorkOrder,
  getWorkOrders,
  getWorkOrderById,
} from '../controllers/clerkController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Allowed roles for all clerk actions
const CLERK_ROLES = ['DESK_CLERK', 'TOWNSHIP_COO'];

// ─────────────────────────────────────────────────────────────────────────────
// Complaint Triage & Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  PATCH /api/v1/clerk/complaints/:id/triage
 * @desc   Open complaint for desk clerk review (REPORTED → UNDER_REVIEW)
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.patch(
  '/complaints/:id/triage',
  authenticate,
  requireRole(...CLERK_ROLES),
  triageComplaint
);

/**
 * @route  PATCH /api/v1/clerk/complaints/:id/validate
 * @desc   Validate complaint — approve for Work Order creation (UNDER_REVIEW → VALIDATED)
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.patch(
  '/complaints/:id/validate',
  authenticate,
  requireRole(...CLERK_ROLES),
  validateComplaint
);

/**
 * @route  PATCH /api/v1/clerk/complaints/:id/reject
 * @desc   Reject complaint with documented reason (UNDER_REVIEW → REJECTED)
 * @body   { reason: string, remarks?: string }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.patch(
  '/complaints/:id/reject',
  authenticate,
  requireRole(...CLERK_ROLES),
  rejectComplaint
);

// ─────────────────────────────────────────────────────────────────────────────
// Work Orders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/v1/clerk/work-orders
 * @desc   Create Work Order from a VALIDATED complaint with AMC line items
 * @body   { complaintId, contractorId, lineItems, priority, specialInstructions }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/work-orders',
  authenticate,
  requireRole(...CLERK_ROLES),
  createWorkOrder
);

/**
 * @route  GET /api/v1/clerk/work-orders
 * @desc   List all work orders for the clerk's township
 * @query  ?status=WORK_ORDER_CREATED&priority=HIGH&contractorId=...
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.get(
  '/work-orders',
  authenticate,
  requireRole(...CLERK_ROLES),
  getWorkOrders
);

/**
 * @route  GET /api/v1/clerk/work-orders/:id
 * @desc   Get single work order detail (by UUID or WO code like WO-2026-4921)
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.get(
  '/work-orders/:id',
  authenticate,
  requireRole(...CLERK_ROLES),
  getWorkOrderById
);

export default router;
