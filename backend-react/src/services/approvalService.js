/**
 * approvalService.js — TIMS Department Head Approval & Governance Service (Member 4)
 *
 * Implements 3-tier financial governance and approval thresholds:
 * - Estimates <= 10,000 INR are auto-approved / desk-clerk authorized
 * - Estimates > 10,000 INR require Department Head sign-off
 * - Multi-township and departmental scope verification
 * 
 * Manages status transitions for Approvals.
 */

import db from '../config/db.js';

export const APPROVAL_THRESHOLDS = {
  CLERK_LIMIT: 10000,
  DEPT_HEAD_LIMIT: 100000,
  COO_LIMIT: Infinity,
};

/**
 * Checks whether an estimate requires Department Head approval
 * @param {number} amount
 * @returns {boolean}
 */
export function requiresDeptHeadApproval(amount = 0) {
  return Number(amount) > APPROVAL_THRESHOLDS.CLERK_LIMIT;
}

/**
 * Evaluates whether an actor can approve a specific work order estimate
 * @param {object} user - The authenticated user
 * @param {object} workOrder - The target work order
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function canApproveWorkOrder(user, workOrder) {
  if (!user || !workOrder) {
    return { allowed: false, reason: 'Invalid user or work order context.' };
  }

  const role = (user.role || '').toUpperCase();

  // COO can approve anything within township
  if (role === 'TOWNSHIP_COO') {
    return { allowed: true };
  }

  if (role !== 'DEPARTMENT_HEAD') {
    return {
      allowed: false,
      reason: `Role '${role}' is not authorized to perform Department Head approvals.`,
    };
  }

  // Multi-Township verification
  if (user.townshipId && workOrder.township_id && user.townshipId !== workOrder.township_id) {
    return { allowed: false, reason: 'Cross-township authorization failed.' };
  }

  return { allowed: true };
}

/**
 * Process a decision on a pending work order / complaint.
 */
export function processApprovalDecision(wo, complaint, action, notes, user) {
  const normalizedAction = (action || '').toUpperCase();
  const now = new Date().toISOString();
  const actorName = user.name || 'Department Head';
  const townshipId = user.townshipId || complaint?.township_id || wo?.township_id;

  if (normalizedAction === 'APPROVE') {
    const targetStatus = 'ASSIGNED';
    const historyNote = `Estimate approved by Department Head ${actorName}. Work Order assigned for contractor dispatch. ${notes ? `Notes: "${notes}"` : ''}`;

    if (wo) {
      wo = db.update('work_orders', wo.id, {
        status: targetStatus,
        approved_by_id: user.id,
        approved_by_name: actorName,
        approved_at: now,
        approval_notes: notes || null,
      });
    }

    if (complaint) {
      complaint = db.update('complaints', complaint.id, {
        status: targetStatus,
        history: [
          ...(complaint.history || []),
          { stage: targetStatus, timestamp: now, actor: actorName, note: historyNote },
        ],
      });
    }

    db.logAudit({
      township_id: townshipId,
      entity_type: 'WORK_ORDER',
      entity_id: wo?.id || complaint?.id,
      actor_id: user.id,
      actor_role: user.role,
      action: 'DEPT_HEAD_APPROVED',
      from_state: 'AWAITING_DEPT_HEAD',
      to_state: targetStatus,
      notes: historyNote,
    });

    return { targetStatus, wo, complaint };
  }

  if (normalizedAction === 'REQUEST_REVISION') {
    const targetStatus = 'REVISION_REQUESTED';
    const revisionReason = notes || 'Estimate rates or quantities require re-evaluation against ground inspection.';
    const historyNote = `Revision Requested by Department Head ${actorName}: "${revisionReason}"`;

    if (wo) {
      wo = db.update('work_orders', wo.id, {
        status: targetStatus,
        revision_notes: revisionReason,
        revision_requested_at: now,
        revision_requested_by: actorName,
      });
    }

    if (complaint) {
      complaint = db.update('complaints', complaint.id, {
        status: targetStatus,
        history: [
          ...(complaint.history || []),
          { stage: targetStatus, timestamp: now, actor: actorName, note: historyNote },
        ],
      });
    }

    db.logAudit({
      township_id: townshipId,
      entity_type: 'WORK_ORDER',
      entity_id: wo?.id || complaint?.id,
      actor_id: user.id,
      actor_role: user.role,
      action: 'REVISION_REQUESTED',
      from_state: 'AWAITING_DEPT_HEAD',
      to_state: targetStatus,
      notes: historyNote,
    });

    return { targetStatus, wo, complaint };
  }

  if (normalizedAction === 'FORWARD_TO_COO') {
    const targetStatus = 'AWAITING_COO';
    const historyNote = `Estimate forwarded to COO by Department Head ${actorName}. ${notes ? `Notes: "${notes}"` : ''}`;

    if (wo) {
      wo = db.update('work_orders', wo.id, {
        status: targetStatus,
        forwarded_to_coo_at: now,
        forwarded_to_coo_by: actorName,
      });
    }

    if (complaint) {
      complaint = db.update('complaints', complaint.id, {
        status: targetStatus,
        history: [
          ...(complaint.history || []),
          { stage: targetStatus, timestamp: now, actor: actorName, note: historyNote },
        ],
      });
    }

    db.logAudit({
      township_id: townshipId,
      entity_type: 'WORK_ORDER',
      entity_id: wo?.id || complaint?.id,
      actor_id: user.id,
      actor_role: user.role,
      action: 'FORWARDED_TO_COO',
      from_state: 'AWAITING_DEPT_HEAD',
      to_state: targetStatus,
      notes: historyNote,
    });

    return { targetStatus, wo, complaint };
  }

  if (normalizedAction === 'REJECT') {
    const targetStatus = 'REJECTED';
    const rejectReason = notes || 'Estimate rejected by Department Head.';
    const historyNote = `Estimate Rejected by Department Head ${actorName}: "${rejectReason}"`;

    if (wo) {
      wo = db.update('work_orders', wo.id, {
        status: targetStatus,
        rejection_notes: rejectReason,
        rejected_at: now,
        rejected_by: actorName,
      });
    }

    if (complaint) {
      complaint = db.update('complaints', complaint.id, {
        status: targetStatus,
        history: [
          ...(complaint.history || []),
          { stage: targetStatus, timestamp: now, actor: actorName, note: historyNote },
        ],
      });
    }

    db.logAudit({
      township_id: townshipId,
      entity_type: 'WORK_ORDER',
      entity_id: wo?.id || complaint?.id,
      actor_id: user.id,
      actor_role: user.role,
      action: 'REJECTED',
      from_state: 'AWAITING_DEPT_HEAD',
      to_state: targetStatus,
      notes: historyNote,
    });

    return { targetStatus, wo, complaint };
  }
}

export default {
  APPROVAL_THRESHOLDS,
  requiresDeptHeadApproval,
  canApproveWorkOrder,
  processApprovalDecision
};
