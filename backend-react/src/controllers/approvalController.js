import db from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { processApprovalDecision } from '../services/approvalService.js';

/**
 * @desc   Get pending estimate approvals awaiting Department Head sign-off
 * @route  GET /api/v1/dept-head/approvals
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const getPendingApprovals = async (req, res, next) => {
  try {
    const townshipId = req.user.townshipId;

    // Fetch work orders requiring Dept Head sign-off
    const pendingWOs = db.findAll('work_orders', (wo) => {
      const matchTownship = !townshipId || wo.township_id === townshipId;
      const awaiting = wo.status === 'AWAITING_DEPT_HEAD' || wo.requires_dept_head === true;
      return matchTownship && awaiting && wo.status !== 'ASSIGNED' && wo.status !== 'COMPLETED';
    });

    // Enrich with complaint and contractor context
    const enriched = pendingWOs.map((wo) => {
      const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
      const contractor = wo.contractor_id
        ? db.findOne('contractors', (cnt) => cnt.id === wo.contractor_id)
        : null;

      return {
        id: wo.id,
        workOrderCode: wo.work_order_code,
        complaintId: wo.complaint_id,
        title: complaint?.title || 'Infrastructure Remediation',
        category: complaint?.category || 'General',
        severity: complaint?.severity || wo.priority || 'Medium',
        status: wo.status,
        estimateAmount: wo.estimate_amount,
        lineItems: wo.line_items || [],
        specialInstructions: wo.special_instructions,
        slaDeadline: complaint?.slaDeadline || wo.sla_deadline,
        createdAt: wo.created_at,
        complaint: complaint
          ? {
              id: complaint.id,
              complaintCode: complaint.complaint_code,
              description: complaint.description,
              location: complaint.location || { sector: complaint.sector },
              reportedBy: complaint.reportedBy || { name: 'Citizen Representative' },
            }
          : null,
        contractor: contractor
          ? {
              id: contractor.id,
              name: contractor.company_name,
              contactPerson: contractor.contact_person,
              phone: contractor.phone,
              email: contractor.email,
            }
          : null,
      };
    });

    // Also include any complaints directly in AWAITING_DEPT_HEAD status without WO object yet
    const rawComplaints = db.findAll('complaints', (c) => {
      const matchTownship = !townshipId || c.township_id === townshipId;
      const alreadyInWO = pendingWOs.some((w) => w.complaint_id === c.id);
      return matchTownship && c.status === 'AWAITING_DEPT_HEAD' && !alreadyInWO;
    });

    for (const c of rawComplaints) {
      enriched.push({
        id: `virtual-wo-${c.id}`,
        workOrderCode: c.workOrderId || `WO-PENDING-${c.id.slice(-4)}`,
        complaintId: c.id,
        title: c.title,
        category: c.category,
        severity: c.severity,
        status: 'AWAITING_DEPT_HEAD',
        estimateAmount: c.estimateAmount || 14500,
        lineItems: [],
        slaDeadline: c.slaDeadline,
        createdAt: c.createdAt || c.created_at,
        complaint: c,
        contractor: c.assignedContractor || null,
      });
    }

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get details of a specific estimate approval
 * @route  GET /api/v1/dept-head/approvals/:id
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const getApprovalDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const townshipId = req.user.townshipId;

    let wo = db.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_code === id || w.complaint_id === id
    );

    let complaint = null;
    if (wo) {
      complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    } else {
      complaint = db.findOne(
        'complaints',
        (c) => c.id === id || c.complaint_code === id || c.workOrderId === id
      );
    }

    if (!wo && !complaint) {
      return next(new AppError(`Record '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    // Auth check
    if (townshipId) {
      if ((wo && wo.township_id && wo.township_id !== townshipId) || 
          (complaint && complaint.township_id && complaint.township_id !== townshipId)) {
        return next(new AppError('Forbidden access to another township data', 403, 'FORBIDDEN'));
      }
    }

    const contractor = wo?.contractor_id
      ? db.findById('contractors', wo.contractor_id)
      : complaint?.assignedContractor || null;

    res.status(200).json({
      success: true,
      data: {
        workOrder: wo || null,
        complaint: complaint || null,
        contractor: contractor || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Approve estimate or request revision
 * @route  POST /api/v1/dept-head/approvals/:id
 * @body   { action: 'APPROVE' | 'REQUEST_REVISION', notes?: string }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const processApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action = 'APPROVE', notes } = req.body;

    const normalizedAction = (action || '').toUpperCase();
    if (!['APPROVE', 'REQUEST_REVISION', 'FORWARD_TO_COO', 'REJECT'].includes(normalizedAction)) {
      return next(
        new AppError("Action must be 'APPROVE', 'REQUEST_REVISION', 'FORWARD_TO_COO', or 'REJECT'.", 400, 'VALIDATION_ERROR')
      );
    }

    // Try finding work order or complaint
    let wo = db.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_code === id || w.complaint_id === id
    );

    let complaint = null;
    if (wo) {
      complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    } else {
      complaint = db.findOne(
        'complaints',
        (c) => c.id === id || c.complaint_code === id || c.workOrderId === id
      );
    }

    if (!wo && !complaint) {
      return next(new AppError(`Record '${id}' not found for approval.`, 404, 'NOT_FOUND'));
    }

    const { targetStatus, wo: updatedWo, complaint: updatedComplaint } = processApprovalDecision(wo, complaint, normalizedAction, notes, req.user);

    let message = '';
    if (normalizedAction === 'APPROVE') message = `Estimate approved successfully. Ticket transitioned to ${targetStatus}.`;
    if (normalizedAction === 'REQUEST_REVISION') message = `Revision requested. Returned to Desk Clerk and Contractor.`;
    if (normalizedAction === 'FORWARD_TO_COO') message = `Estimate forwarded to COO for approval.`;
    if (normalizedAction === 'REJECT') message = `Estimate rejected.`;

    return res.status(200).json({
      success: true,
      message,
      data: {
        workOrder: updatedWo,
        complaint: updatedComplaint,
      },
    });
  } catch (err) {
    next(err);
  }
};
