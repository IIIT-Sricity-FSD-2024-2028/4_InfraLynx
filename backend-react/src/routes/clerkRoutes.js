/**
 * clerkRoutes.js — TIMS Desk Clerk API Routes (Member 2)
 *
 * Base path: /api/v1/clerk
 *
 * All routes require JWT authentication (authenticate middleware).
 * All action routes require role DESK_CLERK or TOWNSHIP_COO.
 *
 * Complaint Triage & Validation:
 *   GET    /api/v1/clerk/triage-queue           — Fetch pending complaints awaiting triage & review
 *   GET    /api/v1/clerk/complaints/:id         — Fetch complaint details with duplicate checks
 *   GET    /api/v1/clerk/duplicate-check        — Find possible duplicates within 100m radius
 *   POST   /api/v1/clerk/duplicate-link/:id     — Link duplicate complaint to a master complaint
 *   PATCH  /api/v1/clerk/complaints/:id/triage  — Open for review (REPORTED -> UNDER_REVIEW)
 *   POST   /api/v1/clerk/validate/:id           — Validate or reject complaint
 *   PATCH  /api/v1/clerk/complaints/:id/validate — Approve (UNDER_REVIEW -> VALIDATED)
 *   POST   /api/v1/clerk/reject/:id             — Reject complaint with reason
 *   PATCH  /api/v1/clerk/complaints/:id/reject  — Reject complaint with reason
 *   POST   /api/v1/clerk/reroute/:id            — Reroute complaint to correct department
 *   PATCH  /api/v1/clerk/complaints/:id/reroute — Reroute complaint to correct department
 *   GET    /api/v1/clerk/contractors            — Fetch eligible contractors with valid AMC
 *   POST   /api/v1/clerk/escalate/:id           — Escalate SLA breaches or delayed work
 *
 * Work Orders:
 *   POST   /api/v1/clerk/work-orders            — Create Work Order from validated complaint
 *   GET    /api/v1/clerk/work-orders            — Track Work Orders (status, priority, delayed, unassigned)
 *   GET    /api/v1/clerk/work-orders/:id        — Get single Work Order detail
 *   POST   /api/v1/clerk/work-orders/:id/assign — Assign contractor to Work Order
 *   POST   /api/v1/clerk/work-orders/:id/reassign — Reassign contractor
 */

import express from 'express';
import {
  getTriageQueue,
  getComplaintDetails,
  checkDuplicates,
  linkDuplicate,
  triageComplaint,
  validateComplaint,
  rejectComplaint,
  rerouteComplaint,
  getEligibleContractors,
  escalateComplaint,
  createWorkOrder,
  assignContractor,
  reassignContractor,
  getWorkOrders,
  getWorkOrderById,
} from '../controllers/clerkController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Allowed roles for clerk actions
const CLERK_ROLES = ['DESK_CLERK', 'TOWNSHIP_COO'];
const VIEW_ROLES  = ['DESK_CLERK', 'TOWNSHIP_COO', 'DEPARTMENT_HEAD', 'FIELD_CONTRACTOR', 'FINANCE_OFFICER'];

// -----------------------------------------------------------------------------
// Complaint Triage, Queue & Validation
// -----------------------------------------------------------------------------

/**
 * @route  GET /api/v1/clerk/triage-queue
 * @desc   Fetch complaints awaiting review filtered by clerk's township/department
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.get(
  '/triage-queue',
  authenticate,
  requireRole(...CLERK_ROLES),
  getTriageQueue
);

/**
 * @route  GET /api/v1/clerk/complaints/:id
 * @desc   View complaint details, asset details, location, photos, duplicate matches
 * @access Private (DESK_CLERK, TOWNSHIP_COO, ...VIEW_ROLES)
 */
router.get(
  '/complaints/:id',
  authenticate,
  requireRole(...VIEW_ROLES),
  getComplaintDetails
);

/**
 * @route  GET /api/v1/clerk/duplicate-check
 * @desc   Find possible duplicates within 100m radius
 * @query  ?complaintId=... or ?latitude=&longitude=&category=
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.get(
  '/duplicate-check',
  authenticate,
  requireRole(...CLERK_ROLES),
  checkDuplicates
);

/**
 * @route  POST /api/v1/clerk/duplicate-link/:id
 * @desc   Link duplicate complaint to a master complaint
 * @body   { masterComplaintId: string, notes?: string }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/duplicate-link/:id',
  authenticate,
  requireRole(...CLERK_ROLES),
  linkDuplicate
);

/**
 * @route  PATCH /api/v1/clerk/complaints/:id/triage
 * @desc   Open complaint for desk clerk review (REPORTED -> UNDER_REVIEW)
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.patch(
  '/complaints/:id/triage',
  authenticate,
  requireRole(...CLERK_ROLES),
  triageComplaint
);

/**
 * @route  POST  /api/v1/clerk/validate/:id
 * @route  PATCH /api/v1/clerk/complaints/:id/validate
 * @desc   Validate or reject complaint with reasons
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/validate/:id',
  authenticate,
  requireRole(...CLERK_ROLES),
  validateComplaint
);
router.patch(
  '/complaints/:id/validate',
  authenticate,
  requireRole(...CLERK_ROLES),
  validateComplaint
);

/**
 * @route  POST  /api/v1/clerk/reject/:id
 * @route  PATCH /api/v1/clerk/complaints/:id/reject
 * @desc   Reject invalid complaint with documented reason
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/reject/:id',
  authenticate,
  requireRole(...CLERK_ROLES),
  rejectComplaint
);
router.patch(
  '/complaints/:id/reject',
  authenticate,
  requireRole(...CLERK_ROLES),
  rejectComplaint
);

/**
 * @route  POST  /api/v1/clerk/reroute/:id
 * @route  PATCH /api/v1/clerk/complaints/:id/reroute
 * @desc   Reroute complaint to correct department
 * @body   { targetDepartmentId: string, reason?: string }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/reroute/:id',
  authenticate,
  requireRole(...CLERK_ROLES),
  rerouteComplaint
);
router.patch(
  '/complaints/:id/reroute',
  authenticate,
  requireRole(...CLERK_ROLES),
  rerouteComplaint
);

/**
 * @route  GET /api/v1/clerk/contractors
 * @desc   Fetch contractors eligible for required work with valid AMC contract
 * @query  ?department_id=&category=&township_id=
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.get(
  '/contractors',
  authenticate,
  requireRole(...CLERK_ROLES),
  getEligibleContractors
);

/**
 * @route  POST /api/v1/clerk/escalate/:id
 * @desc   Escalate SLA breaches or delayed work
 * @body   { reason: string, escalateTo?: 'CONTRACTOR' | 'DEPT_HEAD' | 'COO' }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/escalate/:id',
  authenticate,
  requireRole(...CLERK_ROLES),
  escalateComplaint
);

// -----------------------------------------------------------------------------
// Work Orders (under /api/v1/clerk/work-orders)
// -----------------------------------------------------------------------------

/**
 * @route  POST /api/v1/clerk/work-orders
 * @desc   Create Work Order for a validated complaint
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
 * @desc   Track Work Orders with status, assignment, and SLA health
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
 * @desc   Fetch individual Work Order details
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.get(
  '/work-orders/:id',
  authenticate,
  requireRole(...CLERK_ROLES),
  getWorkOrderById
);

/**
 * @route  POST /api/v1/clerk/work-orders/:id/assign
 * @desc   Assign eligible contractor to Work Order (status -> ASSIGNED)
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/work-orders/:id/assign',
  authenticate,
  requireRole(...CLERK_ROLES),
  assignContractor
);

/**
 * @route  POST /api/v1/clerk/work-orders/:id/reassign
 * @desc   Reassign Work Order to different contractor with documented reason
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/work-orders/:id/reassign',
  authenticate,
  requireRole(...CLERK_ROLES),
  reassignContractor
);

export default router;
