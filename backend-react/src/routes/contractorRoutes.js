/**
 * contractorRoutes.js — TIMS Field Contractor API Routes (Member 3)
 *
 * Base path: /api/v1/contractor
 *
 * Protected by JWT authentication and RBAC:
 * - Requires role FIELD_CONTRACTOR or TOWNSHIP_COO
 */

import express from 'express';
import {
  getAssignedJobs,
  getJobById,
  submitSiteInspection,
  submitEstimate,
  updateJobStatus,
  uploadEvidence,
} from '../controllers/contractorController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

const CONTRACTOR_ROLES = ['FIELD_CONTRACTOR', 'TOWNSHIP_COO'];

/**
 * @route  GET /api/v1/contractor/jobs
 * @desc   List assigned work orders for the authenticated contractor
 * @query  ?status=ASSIGNED&priority=HIGH
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
router.get(
  '/jobs',
  authenticate,
  requireRole(...CONTRACTOR_ROLES),
  getAssignedJobs
);

/**
 * @route  GET /api/v1/contractor/jobs/:id
 * @desc   Get single work order details with AMC rates and evidence history
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
router.get(
  '/jobs/:id',
  authenticate,
  requireRole(...CONTRACTOR_ROLES),
  getJobById
);

/**
 * @route  POST /api/v1/contractor/inspection
 * @desc   Submit initial on-site technical inspection findings
 * @body   { workOrderId, complaintId, inspectionNotes, severityConfirmed }
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
router.post(
  '/inspection',
  authenticate,
  requireRole(...CONTRACTOR_ROLES),
  submitSiteInspection
);

/**
 * @route  POST /api/v1/contractor/estimates
 * @desc   Create & submit AMC estimate (quantities x official rates verified on backend)
 * @body   { workOrderId, complaintId, lineItems: Array }
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
router.post(
  '/estimates',
  authenticate,
  requireRole(...CONTRACTOR_ROLES),
  submitEstimate
);

/**
 * @route  PATCH /api/v1/contractor/jobs/:id/status
 * @desc   Update job progress (ASSIGNED -> IN_PROGRESS -> COMPLETED)
 * @body   { status: 'IN_PROGRESS' | 'COMPLETED', remarks?: string }
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
router.patch(
  '/jobs/:id/status',
  authenticate,
  requireRole(...CONTRACTOR_ROLES),
  updateJobStatus
);

/**
 * @route  POST /api/v1/contractor/evidence
 * @desc   Upload geo-tagged before/after proof for RWA citizen verification
 * @body   { workOrderId, complaintId, evidenceType: 'BEFORE' | 'AFTER', photos: Array, caption?: string }
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
router.post(
  '/evidence',
  authenticate,
  requireRole(...CONTRACTOR_ROLES),
  uploadEvidence
);

export default router;
