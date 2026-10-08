/**
 * TIMS Verification & Dispute Service (In-Memory Engine)
 * Handles citizen / RWA verification of completed work, dispute logging,
 * and routing tickets back for mandatory rework.
 */

import db from '../config/db.js';
import { AppError } from '../middleware/error.js';

/**
 * Confirm and verify completed infrastructure fix.
 * Transitions complaint to CLOSED status.
 *
 * @param {string} complaintId
 * @param {object} user - Authenticated user payload
 * @param {object} payload - { rating, remarks }
 * @returns {object} Updated complaint record
 */
export const verifyComplaint = async (complaintId, user, { rating = 5, remarks = '' } = {}) => {
  const complaint = db.findById('complaints', complaintId);
  if (!complaint) {
    throw new AppError(`Complaint with ID '${complaintId}' not found.`, 404, 'NOT_FOUND');
  }

  // Multi-Township isolation check
  if (complaint.township_id !== user.townshipId) {
    throw new AppError('Cross-township operation forbidden.', 403, 'FORBIDDEN');
  }

  // Only complaints awaiting verification can be confirmed
  const validStatuses = ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'];
  if (!validStatuses.includes((complaint.status || '').toUpperCase())) {
    throw new AppError(
      `Complaint '${complaintId}' cannot be verified. Current status is '${complaint.status}'. Only complaints awaiting verification can be verified.`,
      400,
      'INVALID_STATUS'
    );
  }

  const numericRating = Math.min(Math.max(Number(rating) || 5, 1), 5);
  const now = new Date().toISOString();
  const previousStatus = complaint.status;

  const verificationRecord = {
    status: 'CONFIRMED',
    rating: numericRating,
    remarks: remarks || 'Work completed satisfactorily and verified on ground.',
    verified_by: user.name,
    verified_by_id: user.id,
    verified_at: now,
  };

  const updatedHistory = [
    ...(complaint.history || []),
    {
      stage: 'VERIFIED',
      timestamp: now,
      actor: `${user.name} (${user.role})`,
      note: `Work verified and confirmed with a ${numericRating}-star rating. Remarks: ${verificationRecord.remarks}`,
    },
    {
      stage: 'CLOSED',
      timestamp: now,
      actor: 'System Automation',
      note: 'Workflow resolved. Ticket closed and payment authorization released to Finance.',
    },
  ];

  const updatedComplaint = db.update('complaints', complaint.id, {
    status: 'CLOSED',
    verification: verificationRecord,
    history: updatedHistory,
    resolved_at: now,
    closed_at: now,
  });

  // Log in Audit Trail
  db.logAudit({
    township_id: complaint.township_id,
    entity_type: 'COMPLAINT',
    entity_id: complaint.id,
    actor_id: user.id,
    actor_role: user.role,
    action: 'VERIFIED_AND_CLOSED',
    from_state: previousStatus,
    to_state: 'CLOSED',
    notes: `Rated: ${numericRating}/5. ${verificationRecord.remarks}`,
  });

  return updatedComplaint;
};

/**
 * Dispute completed infrastructure fix and request corrective rework.
 * Transitions complaint to DISPUTED status.
 *
 * @param {string} complaintId
 * @param {object} user - Authenticated user payload
 * @param {object} payload - { reason, remarks, notes, photos }
 * @returns {object} Updated complaint record
 */
export const disputeComplaint = async (complaintId, user, { reason = '', remarks = '', notes = '', photos = [] } = {}) => {
  const complaint = db.findById('complaints', complaintId);
  if (!complaint) {
    throw new AppError(`Complaint with ID '${complaintId}' not found.`, 404, 'NOT_FOUND');
  }

  // Multi-Township isolation check
  if (complaint.township_id !== user.townshipId) {
    throw new AppError('Cross-township operation forbidden.', 403, 'FORBIDDEN');
  }

  // Only complaints awaiting verification can be disputed
  const validStatuses = ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED'];
  if (!validStatuses.includes((complaint.status || '').toUpperCase())) {
    throw new AppError(
      `Complaint '${complaintId}' cannot be disputed. Current status is '${complaint.status}'. Only complaints awaiting verification can be disputed for rework.`,
      400,
      'INVALID_STATUS'
    );
  }

  const disputeReason = reason || 'Incomplete resolution / poor quality';
  const disputeRemarks = remarks || notes || 'The repaired fixture is still malfunctioning or incomplete.';
  const now = new Date().toISOString();
  const previousStatus = complaint.status;

  // Save attached dispute photo evidence into complaint_evidence table
  if (Array.isArray(photos) && photos.length > 0) {
    for (const photoUrl of photos) {
      db.insert('complaint_evidence', {
        complaint_id: complaint.id,
        evidence_type: 'DISPUTE',
        file_url: photoUrl,
        caption: `Dispute Evidence: ${disputeReason}`,
        uploaded_by: user.id,
        created_at: now,
      });
    }
  }

  const disputeRecord = {
    reason: disputeReason,
    remarks: disputeRemarks,
    disputed_by: user.name,
    disputed_by_id: user.id,
    disputed_at: now,
    requested_action: 'REWORK',
  };

  const updatedHistory = [
    ...(complaint.history || []),
    {
      stage: 'DISPUTED',
      timestamp: now,
      actor: `${user.name} (${user.role})`,
      note: `Work disputed: ${disputeReason}. Remarks: ${disputeRemarks}. Requesting field rework.`,
    },
  ];

  const updatedComplaint = db.update('complaints', complaint.id, {
    status: 'DISPUTED',
    dispute: disputeRecord,
    history: updatedHistory,
  });

  // Log in Audit Trail
  db.logAudit({
    township_id: complaint.township_id,
    entity_type: 'COMPLAINT',
    entity_id: complaint.id,
    actor_id: user.id,
    actor_role: user.role,
    action: 'DISPUTED',
    from_state: previousStatus,
    to_state: 'DISPUTED',
    notes: `Dispute reason: ${disputeReason}. ${disputeRemarks}`,
  });

  return updatedComplaint;
};

export default {
  verifyComplaint,
  disputeComplaint,
};
