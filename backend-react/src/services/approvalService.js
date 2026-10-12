/**
 * approvalService.js — TIMS Department Head Approval & Governance Service (Member 4)
 *
 * Implements 3-tier financial governance and approval thresholds:
 * - Estimates <= 10,000 INR are auto-approved / desk-clerk authorized
 * - Estimates > 10,000 INR require Department Head sign-off
 * - Estimates > 100,000 INR (major expenditure threshold) require JOINT approval by Civil Dept Head and Township COO
 * - Cross-department access strictly prevented on the server
 */

import db from '../config/db.js';

export const APPROVAL_THRESHOLDS = {
  CLERK_LIMIT: 10000,
  MAJOR_EXPENDITURE_THRESHOLD: 100000, // Above ₹100,000 requires joint Dept Head + COO sign-off
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
  const userTownship = user.townshipId || user.township_id;
  if (userTownship && workOrder.township_id && userTownship !== workOrder.township_id) {
    return { allowed: false, reason: 'Cross-township authorization failed.' };
  }

  // Department ownership verification
  const userDept = user.departmentId || user.department_id;
  if (userDept && workOrder.department_id && userDept !== workOrder.department_id) {
    return { allowed: false, reason: 'Cross-department authorization failed: You cannot approve another department estimate.' };
  }

  return { allowed: true };
}

/**
 * Process a decision on a pending work order / complaint.
 */
export function processApprovalDecision(wo, complaint, action, notes, user) {
  const normalizedAction = (action || '').toUpperCase();
  const now = new Date().toISOString();
  const actorName = user.name || 'Civil Department Head';
  const townshipId = user.townshipId || user.township_id || complaint?.township_id || wo?.township_id;

  const estimateAmount = Number(
    wo?.estimate_amount ||
    wo?.estimated_cost ||
    complaint?.estimateAmount ||
    0
  );

  const isMajorExpenditure = estimateAmount > APPROVAL_THRESHOLDS.MAJOR_EXPENDITURE_THRESHOLD;

  if (normalizedAction === 'APPROVE') {
    // If estimate exceeds major expenditure threshold (> ₹100,000), require joint approval by Township COO
    if (isMajorExpenditure && user.role !== 'TOWNSHIP_COO') {
      const targetStatus = 'AWAITING_COO';
      const historyNote = `Estimate of ₹${estimateAmount.toLocaleString()} approved by Civil Department Head ${actorName}. Major expenditure threshold exceeded (> ₹${APPROVAL_THRESHOLDS.MAJOR_EXPENDITURE_THRESHOLD.toLocaleString()}) — forwarded to Township COO for required executive joint approval. ${notes ? `Notes: "${notes}"` : ''}`;

      if (wo) {
        wo = db.update('work_orders', wo.id, {
          status: targetStatus,
          dept_head_approved: true,
          dept_head_approved_at: now,
          dept_head_approved_by: actorName,
          dept_head_approved_id: user.id,
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

      // Record approval record in approvals table
      db.insert('approvals', {
        township_id: townshipId,
        estimate_id: wo?.id || complaint?.id,
        approver_id: user.id,
        approval_level: 'DEPT_HEAD',
        status: 'APPROVED',
        remarks: `Joint approval pending from COO. ${notes || ''}`,
        approved_at: now,
      });

      db.logAudit({
        township_id: townshipId,
        entity_type: 'WORK_ORDER',
        entity_id: wo?.id || complaint?.id,
        actor_id: user.id,
        actor_role: user.role,
        action: 'DEPT_HEAD_APPROVED_AWAITING_COO',
        from_state: 'AWAITING_DEPT_HEAD',
        to_state: targetStatus,
        notes: historyNote,
      });

      return {
        targetStatus,
        isMajorExpenditure: true,
        requiresCooJointApproval: true,
        message: `Estimate approved by Civil Department Head. Major expenditure threshold exceeded (₹${estimateAmount.toLocaleString()}) — routed to Township COO for joint sign-off.`,
        wo,
        complaint,
      };
    }

    // Standard approval (<= ₹100k or approved by COO)
    const targetStatus = 'ASSIGNED';
    const historyNote = `Estimate of ₹${estimateAmount.toLocaleString()} approved by Civil Department Head ${actorName}. All required approvals complete. Work order assigned for contractor execution. ${notes ? `Notes: "${notes}"` : ''}`;

    if (wo) {
      wo = db.update('work_orders', wo.id, {
        status: targetStatus,
        approved_by_id: user.id,
        approved_by_name: actorName,
        approved_at: now,
        approval_notes: notes || null,
        requires_dept_head: false,
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

    // Record approval in approvals table
    db.insert('approvals', {
      township_id: townshipId,
      estimate_id: wo?.id || complaint?.id,
      approver_id: user.id,
      approval_level: 'DEPT_HEAD',
      status: 'APPROVED',
      remarks: notes || 'Approved for contractor dispatch.',
      approved_at: now,
    });

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

    return {
      targetStatus,
      isMajorExpenditure: false,
      requiresCooJointApproval: false,
      message: `Estimate approved successfully. Ticket transitioned to ${targetStatus} for contractor execution.`,
      wo,
      complaint,
    };
  }

  if (normalizedAction === 'REJECT') {
    const targetStatus = 'REJECTED';
    const rejectReason = notes || 'Estimate rejected by Civil Department Head.';
    const historyNote = `Estimate Rejected by Civil Department Head ${actorName}: "${rejectReason}"`;

    if (wo) {
      wo = db.update('work_orders', wo.id, {
        status: targetStatus,
        rejection_notes: rejectReason,
        rejected_at: now,
        rejected_by: actorName,
        rejected_by_id: user.id,
      });
    }

    if (complaint) {
      complaint = db.update('complaints', complaint.id, {
        status: targetStatus,
        rejection_reason: rejectReason,
        history: [
          ...(complaint.history || []),
          { stage: targetStatus, timestamp: now, actor: actorName, note: historyNote },
        ],
      });
    }

    // Record rejection in approvals table
    db.insert('approvals', {
      township_id: townshipId,
      estimate_id: wo?.id || complaint?.id,
      approver_id: user.id,
      approval_level: 'DEPT_HEAD',
      status: 'REJECTED',
      remarks: rejectReason,
      approved_at: now,
    });

    db.logAudit({
      township_id: townshipId,
      entity_type: 'WORK_ORDER',
      entity_id: wo?.id || complaint?.id,
      actor_id: user.id,
      actor_role: user.role,
      action: 'ESTIMATE_REJECTED',
      from_state: 'AWAITING_DEPT_HEAD',
      to_state: targetStatus,
      notes: historyNote,
    });

    return {
      targetStatus,
      message: `Estimate rejected. Reason: "${rejectReason}". Work cannot proceed until corrected and resubmitted.`,
      wo,
      complaint,
    };
  }

  if (normalizedAction === 'REQUEST_REVISION') {
    const targetStatus = 'REVISION_REQUESTED';
    const revisionReason = notes || 'Estimate rates or quantities require re-evaluation against ground inspection.';
    const historyNote = `Revision Requested by Civil Department Head ${actorName}: "${revisionReason}"`;

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

    return {
      targetStatus,
      message: `Revision requested. Returned to contractor for correction: "${revisionReason}".`,
      wo,
      complaint,
    };
  }

  if (normalizedAction === 'FORWARD_TO_COO') {
    const targetStatus = 'AWAITING_COO';
    const historyNote = `Estimate forwarded to Township COO by Civil Department Head ${actorName}. ${notes ? `Notes: "${notes}"` : ''}`;

    if (wo) {
      wo = db.update('work_orders', wo.id, {
        status: targetStatus,
        forwarded_to_coo_at: now,
        forwarded_to_coo_by: actorName,
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
      action: 'FORWARDED_TO_COO',
      from_state: 'AWAITING_DEPT_HEAD',
      to_state: targetStatus,
      notes: historyNote,
    });

    return {
      targetStatus,
      message: `Estimate forwarded to Township COO for approval.`,
      wo,
      complaint,
    };
  }
}

export default {
  APPROVAL_THRESHOLDS,
  requiresDeptHeadApproval,
  canApproveWorkOrder,
  processApprovalDecision,
};
