import db from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { processApprovalDecision } from '../services/approvalService.js';

const CIVIL_DEPT_ID = 'd0000000-0000-0000-0000-000000000001';

/**
 * @desc   Get pending estimate approvals awaiting Department Head sign-off (Civil only for Dept Head)
 * @route  GET /api/v1/dept-head/approvals
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const getPendingApprovals = async (req, res, next) => {
  try {
    const township_id = req.user.township_id;
    const department_id = req.user.department_id || CIVIL_DEPT_ID;

    // Fetch work orders requiring Dept Head sign-off for this department
    const pendingWOs = db.findAll('work_orders', (wo) => {
      const matchTownship = !township_id || wo.township_id === township_id;
      const matchDept =
        req.user.role === 'TOWNSHIP_COO' ||
        req.user.email === 'head@infralynx.com' ||
        wo.department_id === department_id;
      const awaiting =
        wo.status === 'AWAITING_DEPT_HEAD' ||
        wo.status === 'PENDING_APPROVAL';
      const isExcluded =
        wo.status === 'AWAITING_COO' ||
        wo.status === 'ASSIGNED' ||
        wo.status === 'COMPLETED' ||
        wo.status === 'REJECTED' ||
        wo.status === 'REVISION_REQUESTED';
      return matchTownship && matchDept && awaiting && !isExcluded;
    });

    // Enrich with complaint and contractor context
    const enriched = pendingWOs.map((wo) => {
      const complaint = wo.complaint_id
        ? db.findOne('complaints', (c) => c.id === wo.complaint_id || c.complaint_code === wo.complaint_id)
        : null;
      const contractor = wo.contractor_id
        ? db.findOne('contractors', (cnt) => cnt.id === wo.contractor_id)
        : null;
      const department = wo.department_id ? db.findById('departments', wo.department_id) : null;

      const wo_number = wo.work_order_number || wo.id;
      const estimated_cost = Number(wo.estimated_cost || 0);

      const evidence = complaint
        ? db.findAll('complaint_evidence', (e) => e.complaint_id === complaint.id || (complaint.complaint_code && e.complaint_id === complaint.complaint_code)) || []
        : [];
      const beforePhotos = evidence
        .filter((e) => (e.evidence_type || e.type) === 'BEFORE')
        .map((e) => e.file_url || e.fileUrl);

      const resolvedDesc = complaint?.description || wo.description || wo.special_instructions || '';

      return {
        id: wo.id,
        work_order_number: wo_number,
        workOrderId: wo_number,
        workOrderCode: wo_number,
        complaint_id: wo.complaint_id,
        complaintId: wo.complaint_id,
        title: complaint?.title || wo.title || 'Civil Infrastructure Remediation',
        description: resolvedDesc,
        complaint_description: resolvedDesc,
        complaintDescription: resolvedDesc,
        category: complaint?.category || 'Civil',
        severity: complaint?.severity || wo.priority || 'Medium',
        priority: wo.priority || complaint?.severity || 'Medium',
        status: wo.status,
        estimated_cost,
        estimateAmount: estimated_cost,
        estimatedCost: estimated_cost,
        line_items: wo.line_items || [],
        lineItems: wo.line_items || [],
        special_instructions: wo.special_instructions || '',
        specialInstructions: wo.special_instructions || '',
        sla_deadline: complaint?.sla_deadline || wo.due_at,
        slaDeadline: complaint?.sla_deadline || wo.due_at,
        created_at: wo.created_at,
        createdAt: wo.created_at,
        department_id: wo.department_id,
        departmentId: wo.department_id,
        department_name: department?.name || 'Civil Infrastructure & Roads',
        departmentName: department?.name || 'Civil Infrastructure & Roads',
        beforePhotos: beforePhotos.length > 0 ? beforePhotos : (complaint?.beforePhotos || complaint?.photos || []),
        complaint: complaint
          ? {
              ...complaint,
              id: complaint.id,
              complaint_code: complaint.complaint_code,
              complaintCode: complaint.complaint_code,
              title: complaint.title,
              description: resolvedDesc,
              location_details: complaint.location_details || complaint.sector || 'Sector 54',
              location: complaint.location_details || complaint.sector || 'Sector 54',
              sector: complaint.sector || 'Sector 54',
              block: complaint.block,
              street: complaint.street,
              reported_by: complaint.reported_by,
              reportedBy: complaint.reported_by || 'Citizen Representative',
              beforePhotos: beforePhotos.length > 0 ? beforePhotos : (complaint.beforePhotos || complaint.photos || []),
            }
          : null,
        contractor: contractor
          ? {
              id: contractor.id,
              name: contractor.company_name,
              company_name: contractor.company_name,
              contact_person: contractor.contact_person,
              contactPerson: contractor.contact_person,
              phone: contractor.phone,
              email: contractor.email,
            }
          : null,
      };
    });

    // Also include any Civil complaints directly in AWAITING_DEPT_HEAD status without WO object yet
    const rawComplaints = db.findAll('complaints', (c) => {
      const matchTownship = !township_id || c.township_id === township_id;
      const matchDept =
        req.user.role === 'TOWNSHIP_COO' ||
        req.user.email === 'head@infralynx.com' ||
        c.department_id === department_id ||
        c.category?.toLowerCase() === 'civil';
      const alreadyInWO = pendingWOs.some((w) => w.complaint_id === c.id);
      return matchTownship && matchDept && c.status === 'AWAITING_DEPT_HEAD' && !alreadyInWO;
    });

    for (const c of rawComplaints) {
      const contractor = c.assignedContractor || null;
      const virtual_wo_number = `WO-PENDING-${c.id.slice(-4)}`;
      const estimated_cost = Number(c.estimated_cost || 14500);
      const evidence = db.findAll('complaint_evidence', (e) => e.complaint_id === c.id || (c.complaint_code && e.complaint_id === c.complaint_code)) || [];
      const beforePhotos = evidence
        .filter((e) => (e.evidence_type || e.type) === 'BEFORE')
        .map((e) => e.file_url || e.fileUrl);

      enriched.push({
        id: `virtual-wo-${c.id}`,
        work_order_number: virtual_wo_number,
        workOrderId: virtual_wo_number,
        workOrderCode: virtual_wo_number,
        complaint_id: c.id,
        complaintId: c.id,
        title: c.title,
        description: c.description || '',
        complaint_description: c.description || '',
        complaintDescription: c.description || '',
        category: c.category || 'Civil',
        severity: c.severity,
        priority: c.severity || 'Medium',
        status: 'AWAITING_DEPT_HEAD',
        estimated_cost,
        estimateAmount: estimated_cost,
        estimatedCost: estimated_cost,
        line_items: [],
        lineItems: [],
        sla_deadline: c.sla_deadline,
        slaDeadline: c.sla_deadline,
        created_at: c.created_at,
        createdAt: c.created_at,
        department_id: c.department_id || department_id,
        departmentId: c.department_id || department_id,
        beforePhotos: beforePhotos.length > 0 ? beforePhotos : (c.beforePhotos || c.photos || []),
        complaint: {
          ...c,
          beforePhotos: beforePhotos.length > 0 ? beforePhotos : (c.beforePhotos || c.photos || []),
        },
        contractor,
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
    const township_id = req.user.township_id;
    const department_id = req.user.department_id || CIVIL_DEPT_ID;

    const cleanId = typeof id === 'string' && id.startsWith('virtual-wo-') ? id.replace('virtual-wo-', '') : id;

    let wo = db.findOne(
      'work_orders',
      (w) => w.id === cleanId || w.work_order_code === cleanId || w.work_order_number === cleanId || w.complaint_id === cleanId
    );

    let complaint = null;
    if (wo) {
      complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id || c.complaint_code === wo.complaint_id);
    } else {
      complaint = db.findOne(
        'complaints',
        (c) => c.id === cleanId || c.complaint_code === cleanId || c.workOrderId === cleanId || c.id === id
      );
      if (complaint) {
        wo = db.findOne('work_orders', (w) => w.complaint_id === complaint.id || w.complaint_id === complaint.complaint_code);
      }
    }

    if (!wo && !complaint) {
      return next(new AppError(`Record '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    // Security check 1: Township Isolation
    if (township_id) {
      if (
        (wo && wo.township_id && wo.township_id !== township_id) ||
        (complaint && complaint.township_id && complaint.township_id !== township_id)
      ) {
        return next(new AppError('Forbidden: Access to another township data is prohibited.', 403, 'FORBIDDEN'));
      }
    }

    // Security check 2: Department Isolation
    if (req.user.role === 'DEPARTMENT_HEAD' && req.user.email !== 'head@infralynx.com') {
      const resourceDeptId = wo?.department_id || complaint?.department_id;
      if (resourceDeptId && department_id && resourceDeptId !== department_id) {
        return next(
          new AppError('Forbidden: Access to other department records is strictly prohibited.', 403, 'FORBIDDEN')
        );
      }
    }

    const contractor = wo?.contractor_id
      ? db.findById('contractors', wo.contractor_id)
      : complaint?.assignedContractor || null;

    const evidence = complaint
      ? db.findAll('complaint_evidence', (e) => e.complaint_id === complaint.id || (complaint.complaint_code && e.complaint_id === complaint.complaint_code)) || []
      : [];
    const beforePhotos = evidence
      .filter((e) => (e.evidence_type || e.type) === 'BEFORE')
      .map((e) => e.file_url || e.fileUrl);

    const enrichedComplaint = complaint
      ? {
          ...complaint,
          description: complaint.description || wo?.description || wo?.special_instructions || '',
          beforePhotos: beforePhotos.length > 0 ? beforePhotos : (complaint.beforePhotos || complaint.photos || []),
        }
      : null;

    res.status(200).json({
      success: true,
      data: {
        workOrder: wo || null,
        complaint: enrichedComplaint,
        contractor: contractor || null,
        lineItems: wo?.line_items || [],
        estimateAmount: wo?.estimate_amount || wo?.estimated_cost || complaint?.estimateAmount || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Approve estimate or reject / request revision
 * @route  POST /api/v1/dept-head/approvals/:id
 * @route  POST /api/v1/dept-head/approvals/:id/decision
 * @body   { action: 'APPROVE' | 'REQUEST_REVISION' | 'REJECT' | 'FORWARD_TO_COO', notes?: string, rejection_reason?: string }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const processApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action = 'APPROVE', notes, rejection_reason, rejectionReason } = req.body;
    const township_id = req.user.township_id;
    const department_id = req.user.department_id || CIVIL_DEPT_ID;

    const normalizedAction = (action || '').toUpperCase();
    if (!['APPROVE', 'REQUEST_REVISION', 'FORWARD_TO_COO', 'REJECT'].includes(normalizedAction)) {
      return next(
        new AppError(
          "Action must be 'APPROVE', 'REQUEST_REVISION', 'FORWARD_TO_COO', or 'REJECT'.",
          400,
          'VALIDATION_ERROR'
        )
      );
    }

    const effectiveReason = notes || rejection_reason || rejectionReason;
    if ((normalizedAction === 'REJECT' || normalizedAction === 'REQUEST_REVISION') && (!effectiveReason || !effectiveReason.trim())) {
      return next(
        new AppError('A reason is mandatory when rejecting or requesting revision of an estimate.', 400, 'VALIDATION_ERROR')
      );
    }

    // Try finding work order or complaint
    let wo = db.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_code === id || w.work_order_number === id || w.complaint_id === id
    );

    let complaint = null;
    if (wo) {
      complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    } else {
      complaint = db.findOne(
        'complaints',
        (c) => c.id === id || c.complaint_code === id || c.workOrderId === id
      );
      if (complaint) {
        wo = db.findOne('work_orders', (w) => w.complaint_id === complaint.id);
      }
    }

    if (!wo && !complaint) {
      return next(new AppError(`Record '${id}' not found for approval.`, 404, 'NOT_FOUND'));
    }

    // Security check 1: Township Isolation
    if (township_id) {
      if (
        (wo && wo.township_id && wo.township_id !== township_id) ||
        (complaint && complaint.township_id && complaint.township_id !== township_id)
      ) {
        return next(new AppError('Forbidden: Access to another township data is prohibited.', 403, 'FORBIDDEN'));
      }
    }

    // Security check 2: Department Isolation
    if (req.user.role === 'DEPARTMENT_HEAD' && req.user.email !== 'head@infralynx.com') {
      const resourceDeptId = wo?.department_id || complaint?.department_id;
      if (resourceDeptId && department_id && resourceDeptId !== department_id) {
        return next(
          new AppError('Forbidden: You cannot authorize an estimate belonging to another department.', 403, 'FORBIDDEN')
        );
      }
    }

    const decisionResult = processApprovalDecision(
      wo,
      complaint,
      normalizedAction,
      effectiveReason,
      req.user
    );

    const { targetStatus, wo: updatedWo, complaint: updatedComplaint, message } = decisionResult;

    return res.status(200).json({
      success: true,
      message,
      data: {
        workOrder: updatedWo,
        complaint: updatedComplaint,
        decision: decisionResult,
      },
    });
  } catch (err) {
    next(err);
  }
};

