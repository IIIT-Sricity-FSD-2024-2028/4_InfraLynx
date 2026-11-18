/**
 * TIMS Complaint Routes (Member 1 - RWA Backend)
 * Connects Express router with JWT Auth, Role RBAC, Multer upload, and Complaint Controller.
 */

import express from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  cancelComplaint,
  verifyComplaint,
  pauseComplaint,
  resumeComplaint,
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
 * @route   PUT /api/v1/complaints/:id
 * @desc    Update/edit reported complaint details (RWA mistake correction)
 * @access  Private (RWA, TOWNSHIP_COO, DESK_CLERK)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('RWA', 'TOWNSHIP_COO', 'DESK_CLERK'),
  uploadArray('photos', 5),
  updateComplaint
);

/**
 * @route   POST /api/v1/complaints/:id/cancel
 * @desc    Cancel reported complaint prior to execution
 * @access  Private (RWA, TOWNSHIP_COO, DESK_CLERK)
 */
router.post(
  '/:id/cancel',
  authenticate,
  requireRole('RWA', 'TOWNSHIP_COO', 'DESK_CLERK'),
  cancelComplaint
);

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


router.post('/:id/pause', authenticate, requireRole('RWA', 'DESK_CLERK', 'TOWNSHIP_COO'), pauseComplaint);
router.post('/:id/resume', authenticate, requireRole('RWA', 'DESK_CLERK', 'TOWNSHIP_COO'), resumeComplaint);

export default router;
