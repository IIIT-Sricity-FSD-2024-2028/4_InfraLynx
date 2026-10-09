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
} from '../controllers/workOrderController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

const CLERK_ROLES = ['DESK_CLERK', 'TOWNSHIP_COO'];
const VIEW_ROLES  = ['DESK_CLERK', 'TOWNSHIP_COO', 'DEPARTMENT_HEAD', 'FIELD_CONTRACTOR', 'FINANCE_OFFICER'];

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

export default router;