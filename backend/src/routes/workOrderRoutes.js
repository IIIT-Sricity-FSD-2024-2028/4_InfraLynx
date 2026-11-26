/**
 * workOrderRoutes.js — TIMS Work Order API Routes (Member 2 - Desk Clerk)
 *
 * Base path: /api/v1/work-orders
 *
 * All routes require JWT authentication (authenticate middleware).
 *
 * Routes:
 *   POST  /api/v1/work-orders              — Create Work Order from validated complaint
 *   GET   /api/v1/work-orders              — List / track Work Orders (supports ?status=&priority=&unassigned=&delayed=)
 *   GET   /api/v1/work-orders/:id          — Get single Work Order detail
 *   POST  /api/v1/work-orders/:id/assign   — Assign eligible contractor to Work Order
 *   POST  /api/v1/work-orders/:id/reassign — Reassign Work Order to different contractor
 */

import express from 'express';
import {
  createWorkOrder,
  assignContractor,
  reassignContractor,
  getWorkOrders,
  getWorkOrderById,
  openBidding,
  submitBid,
  getWorkOrderBids,
  autoSelectBestBid,
  addOverrunInquiry,
  respondToOverrunInquiry,
  resolveOverrunInquiry,
  retractBid,
  pauseWorkOrder,
  resumeWorkOrder,
} from '../controllers/workOrderController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

const CLERK_ROLES = ['DESK_CLERK', 'TOWNSHIP_COO'];
const VIEW_ROLES  = ['DESK_CLERK', 'TOWNSHIP_COO', 'DEPARTMENT_HEAD', 'FIELD_CONTRACTOR', 'FINANCE_CLERK'];

/**
 * @route  POST /api/v1/work-orders
 * @desc   Create Work Order from a VALIDATED complaint with AMC line items
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/',
  authenticate,
  requireRole(...CLERK_ROLES),
  createWorkOrder
);

/**
 * @route  GET /api/v1/work-orders
 * @desc   Track Work Orders with SLA monitoring and unassigned/delayed filters
 * @access Private (DESK_CLERK, TOWNSHIP_COO, DEPARTMENT_HEAD, FIELD_CONTRACTOR)
 */
router.get(
  '/',
  authenticate,
  requireRole(...VIEW_ROLES),
  getWorkOrders
);

/**
 * @route  GET /api/v1/work-orders/:id
 * @desc   Get single Work Order details with complaint & contractor context
 * @access Private (DESK_CLERK, TOWNSHIP_COO, DEPARTMENT_HEAD, FIELD_CONTRACTOR)
 */
router.get(
  '/:id',
  authenticate,
  requireRole(...VIEW_ROLES),
  getWorkOrderById
);

/**
 * @route  POST /api/v1/work-orders/:id/assign
 * @desc   Assign eligible contractor to Work Order (status -> ASSIGNED)
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/:id/assign',
  authenticate,
  requireRole(...CLERK_ROLES),
  assignContractor
);

/**
 * @route  POST /api/v1/work-orders/:id/reassign
 * @desc   Reassign Work Order to a different contractor with mandatory reason
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/:id/reassign',
  authenticate,
  requireRole(...CLERK_ROLES),
  reassignContractor
);

/**
 * @route  POST /api/v1/work-orders/:id/open-bidding
 * @desc   Open Work Order for multi-contractor bidding
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/:id/open-bidding',
  authenticate,
  requireRole(...CLERK_ROLES),
  openBidding
);

/**
 * @route  POST /api/v1/work-orders/:id/bids
 * @desc   Submit a contractor bid on a Work Order
 * @access Private (FIELD_CONTRACTOR, DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/:id/bids',
  authenticate,
  requireRole('FIELD_CONTRACTOR', 'DESK_CLERK', 'TOWNSHIP_COO'),
  submitBid
);

/**
 * @route  GET /api/v1/work-orders/:id/bids
 * @desc   Get all bids on a Work Order with composite scoring
 * @access Private
 */
router.get(
  '/:id/bids',
  authenticate,
  requireRole(...VIEW_ROLES),
  getWorkOrderBids
);

/**
 * @route  POST /api/v1/work-orders/:id/auto-select-bid
 * @desc   Auto-select best contractor bid based on low cost & better rating
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/:id/auto-select-bid',
  authenticate,
  requireRole(...CLERK_ROLES),
  autoSelectBestBid
);

/**
 * @route  POST /api/v1/work-orders/:id/overrun-inquiry
 * @desc   Add an inquiry remark by Finance or COO when amount used > amount asked
 * @access Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/:id/overrun-inquiry',
  authenticate,
  requireRole('FINANCE_CLERK', 'TOWNSHIP_COO'),
  addOverrunInquiry
);

/**
 * @route  POST /api/v1/work-orders/:id/overrun-response
 * @desc   Contractor responds to overrun inquiry with detailed justification
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
router.post(
  '/:id/overrun-response',
  authenticate,
  requireRole('FIELD_CONTRACTOR', 'TOWNSHIP_COO'),
  respondToOverrunInquiry
);

/**
 * @route  POST /api/v1/work-orders/:id/overrun-resolve
 * @desc   Finance or COO resolves/settles overrun inquiry
 * @access Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
router.post(
  '/:id/overrun-resolve',
  authenticate,
  requireRole('FINANCE_CLERK', 'TOWNSHIP_COO'),
  resolveOverrunInquiry
);


router.post('/:id/bids/retract', authenticate, requireRole('FIELD_CONTRACTOR', 'TOWNSHIP_COO', 'DESK_CLERK'), retractBid);
router.delete('/:id/bids', authenticate, requireRole('FIELD_CONTRACTOR', 'TOWNSHIP_COO', 'DESK_CLERK'), retractBid);
router.post('/:id/pause', authenticate, requireRole('DESK_CLERK', 'TOWNSHIP_COO'), pauseWorkOrder);
router.post('/:id/resume', authenticate, requireRole('DESK_CLERK', 'TOWNSHIP_COO'), resumeWorkOrder);

export default router;
