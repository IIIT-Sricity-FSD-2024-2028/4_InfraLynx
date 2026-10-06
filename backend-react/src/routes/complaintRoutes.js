/**
 * TIMS Complaint Routes (Member 1 - RWA Backend)
 * Connects Express router with JWT Auth, Role RBAC, Multer upload, and In-Memory Controller.
 */

import express from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  verifyComplaint,
  disputeComplaint,
} from '../controllers/complaintController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { uploadArray } from '../middleware/upload.js';

const router = express.Router();

/**
 * @route   POST /api/v1/complaints
 * @desc    File new complaint with optional photo uploads
 * @access  Private (RWA, TOWNSHIP_COO)
 */
router.post(
  '/',
  authenticate,
  requireRole('RWA', 'TOWNSHIP_COO'),
  uploadArray('photos', 5),
  createComplaint
);

/**
 * @route   GET /api/v1/complaints
 * @desc    List complaints for current user's township
 * @access  Private
 */
router.get('/', authenticate, getComplaints);

/**
 * @route   GET /api/v1/complaints/:id
 * @desc    Get detailed complaint record with evidence & history
 * @access  Private
 */
router.get('/:id', authenticate, getComplaintById);

/**
 * @route   POST /api/v1/complaints/:id/verify
 * @desc    Verify and close completed repair work
 * @access  Private (RWA, TOWNSHIP_COO)
 */
router.post(
  '/:id/verify',
  authenticate,
  requireRole('RWA', 'TOWNSHIP_COO'),
  verifyComplaint
);

/**
 * @route   POST /api/v1/complaints/:id/dispute
 * @desc    Dispute repair work and request corrective rework
 * @access  Private (RWA, TOWNSHIP_COO)
 */
router.post(
  '/:id/dispute',
  authenticate,
  requireRole('RWA', 'TOWNSHIP_COO'),
  uploadArray('photos', 5),
  disputeComplaint
);

export default router;
