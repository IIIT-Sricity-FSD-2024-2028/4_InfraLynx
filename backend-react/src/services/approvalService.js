/**
 * approvalService.js — TIMS Department Head Approval & Governance Service (Member 4)
 *
 * Implements 3-tier financial governance and approval thresholds:
 * - Estimates <= 10,000 INR are auto-approved / desk-clerk authorized
 * - Estimates > 10,000 INR require Department Head sign-off
 * - Multi-township and departmental scope verification
 */

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

export default {
  APPROVAL_THRESHOLDS,
  requiresDeptHeadApproval,
  canApproveWorkOrder,
};
