/**
 * TIMS Verification Service (PostgreSQL Database Engine)
 * Handles citizen / RWA verification of completed work and ticket closure.
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
  const complaint = db.findOne('complaints', (c) => c.id === complaintId || c.complaint_code === complaintId);
  if (!complaint) {
    throw new AppError(`Complaint with ID '${complaintId}' not found.`, 404, 'NOT_FOUND');
  }

  // Multi-Township isolation check
  if (user.township_id && complaint.township_id && complaint.township_id !== user.township_id) {
    throw new AppError('Cross-township operation forbidden.', 403, 'FORBIDDEN');
  }

  // Complaints awaiting verification or already closed can be confirmed/updated
  const validStatuses = ['PENDING_VERIFICATION', 'COMPLETED', 'WORK_COMPLETED', 'CLOSED'];
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

  // Also update linked work order and invoice to enable Finance payment authorization
  const linkedWo = db.findOne('work_orders', (w) => w.complaint_id === complaint.id || w.complaint_id === complaint.complaint_code);
  if (linkedWo) {
    db.update('work_orders', linkedWo.id, {
      status: 'CLOSED',
      completed_at: now,
      rwa_verified: true,
      verified_at: now,
      rating: numericRating,
      verification_remarks: verificationRecord.remarks,
    });
    const linkedInvoice = db.findOne('invoices', (inv) => inv.work_order_id === linkedWo.id || inv.work_order_id === linkedWo.work_order_number || inv.work_order_id === linkedWo.work_order_code);
    if (linkedInvoice) {
      db.update('invoices', linkedInvoice.id, {
        rwa_verified: true,
        rwa_verified_at: now,
      });
    }
  }

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

export default {
  verifyComplaint,
};
