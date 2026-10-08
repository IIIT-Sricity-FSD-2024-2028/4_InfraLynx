/**
 * contractorController.js — TIMS Field Contractor Backend (Member 3)
 *
 * Responsibilities:
 *   1. Assigned Jobs      — Fetch work orders assigned to the logged-in contractor
 *   2. Job Details        — View single job with complaint & evidence context
 *   3. Site Inspection    — Submit ground inspection notes & confirmation
 *   4. AMC Estimates      — Calculate & submit estimate using official AMC rate cards
 *   5. Job Execution      — Update status: ASSIGNED → IN_PROGRESS → COMPLETED
 *   6. Evidence Proof     — Upload geo-tagged before/after proof for RWA verification
 */

import db from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { calculateVerifiedEstimate } from '../services/estimateService.js';

const DEPT_HEAD_APPROVAL_THRESHOLD = 10000;

/**
 * @desc   Get all jobs / work orders assigned to the contractor
 * @route  GET /api/v1/contractor/jobs
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
export const getAssignedJobs = async (req, res, next) => {
  try {
    const contractorId = req.user.contractorId;
    const { status } = req.query;

    const workOrders = db.findAll('work_orders', (wo) => {
      const matchContractor = !contractorId || wo.contractor_id === contractorId;
      const matchStatus = !status || wo.status === status.toUpperCase();
      return matchContractor && matchStatus;
    });

    const enriched = workOrders.map((wo) => {
      const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id || c.complaint_code === wo.complaint_id);
      const contractor = db.findOne('contractors', (cnt) => cnt.id === wo.contractor_id);
      const evidence = db.findAll('complaint_evidence', (ev) => ev.complaint_id === wo.complaint_id);
      const beforeEvidence = evidence.filter((e) => (e.evidence_type || e.type) === 'BEFORE').map((e) => e.file_url || e.fileUrl);
      const afterEvidence = evidence.filter((e) => (e.evidence_type || e.type) === 'AFTER').map((e) => e.file_url || e.fileUrl);

      return {
        id: wo.id,
        workOrderId: wo.work_order_code || wo.work_order_number || wo.id,
        workOrderCode: wo.work_order_code || wo.work_order_number || wo.id,
        complaintId: wo.complaint_id,
        complaintCode: complaint?.complaint_code || complaint?.id,
        title: complaint?.title || 'Field Work Order',
        category: complaint?.category || 'General',
        subCategory: complaint?.subcategory || complaint?.subCategory || '',
        severity: complaint?.severity || wo.priority || 'Medium',
        priority: wo.priority || complaint?.severity || 'Medium',
        status: wo.status,
        complaintStatus: complaint?.status || wo.status,
        estimateAmount: wo.estimate_amount || wo.estimatedAmount || wo.estimated_cost || 0,
        lineItems: wo.line_items || [],
        specialInstructions: wo.special_instructions || '',
        slaDeadline: complaint?.slaDeadline || wo.sla_deadline,
        createdAt: wo.created_at,
        location: complaint?.location || {
          sector: complaint?.sector || 'Sector 54',
          block: complaint?.block || 'Block A',
          street: complaint?.street || 'Gulmohar Marg',
          assetId: complaint?.asset_id || 'ASSET-GEN-01',
          assetName: complaint?.location_details || 'Township Infrastructure Fixture',
          landmark: complaint?.location_details || '',
        },
        description: complaint?.description || wo.special_instructions || '',
        reportedBy: complaint?.reported_by || { name: 'Dr. Arvind Swaminathan', role: 'RWA Secretary' },
        beforePhotos: (complaint?.beforePhotos && complaint.beforePhotos.length > 0) ? complaint.beforePhotos : beforeEvidence,
        afterPhotos: (complaint?.afterPhotos && complaint.afterPhotos.length > 0) ? complaint.afterPhotos : afterEvidence,
        inspectionNotes: wo.inspection_notes || null,
        inspectedAt: wo.inspected_at || null,
        inspectedBy: wo.inspected_by || null,
        completionRemarks: wo.completion_remarks || null,
        completedAt: wo.completed_at || null,
        evidence,
        contractorName: contractor?.company_name || 'Assigned AMC Partner',
      };
    });

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
 * @desc   Get single work order / job detail by ID
 * @route  GET /api/v1/contractor/jobs/:id
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
export const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const wo = db.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_code === id || w.work_order_number === id
    );

    if (!wo) {
      return next(new AppError(`Work order '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    const evidence = db.findAll('complaint_evidence', (ev) => ev.complaint_id === wo.complaint_id);
    const amcRates = db.findAll('amc_rates');

    res.status(200).json({
      success: true,
      data: {
        id: wo.id,
        workOrderId: wo.work_order_code || wo.work_order_number || wo.id,
        workOrderCode: wo.work_order_code || wo.work_order_number || wo.id,
        complaintId: wo.complaint_id,
        status: wo.status,
        priority: wo.priority,
        estimateAmount: wo.estimate_amount || 0,
        lineItems: wo.line_items || [],
        specialInstructions: wo.special_instructions || '',
        inspectionNotes: wo.inspection_notes || null,
        complaint: complaint || null,
        evidence,
        applicableAmcRates: amcRates,
        createdAt: wo.created_at,
        updatedAt: wo.updated_at || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Submit site inspection findings
 * @route  POST /api/v1/contractor/inspection
 * @body   { workOrderId, complaintId, inspectionNotes, severityConfirmed }
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
export const submitSiteInspection = async (req, res, next) => {
  try {
    const { workOrderId, complaintId, inspectionNotes, severityConfirmed } = req.body;

    const wo = db.findOne(
      'work_orders',
      (w) =>
        w.id === workOrderId ||
        w.work_order_code === workOrderId ||
        w.work_order_number === workOrderId ||
        w.complaint_id === complaintId ||
        w.complaint_id === workOrderId
    );

    if (!wo) {
      return next(new AppError('Valid workOrderId or complaintId is required.', 404, 'NOT_FOUND'));
    }

    const now = new Date().toISOString();
    const actorName = req.user.name || 'Contractor Lead';
    const note = `Site inspected by ${actorName}. Findings: "${inspectionNotes || 'Ground inspection completed.'}"`;

    const updatedWo = db.update('work_orders', wo.id, {
      inspection_notes: inspectionNotes,
      inspected_at: now,
      inspected_by: actorName,
    });

    const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    if (complaint) {
      db.update('complaints', complaint.id, {
        history: [
          ...(complaint.history || []),
          { stage: 'SITE_INSPECTED', timestamp: now, actor: actorName, note },
        ],
      });
    }

    db.logAudit({
      township_id: wo.township_id,
      entity_type: 'WORK_ORDER',
      entity_id: wo.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'SITE_INSPECTION_COMPLETED',
      from_state: wo.status,
      to_state: wo.status,
      notes: note,
    });

    res.status(200).json({
      success: true,
      message: 'Site inspection findings submitted successfully.',
      data: updatedWo,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Create and submit AMC estimate using official rate cards
 * @route  POST /api/v1/contractor/estimates
 * @body   { workOrderId, complaintId, lineItems: Array }
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
export const submitEstimate = async (req, res, next) => {
  try {
    const { workOrderId, complaintId, lineItems } = req.body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return next(new AppError('Estimate must include at least one AMC service line item.', 400, 'VALIDATION_ERROR'));
    }

    const wo = db.findOne(
      'work_orders',
      (w) =>
        w.id === workOrderId ||
        w.work_order_code === workOrderId ||
        w.work_order_number === workOrderId ||
        w.complaint_id === complaintId ||
        w.complaint_id === workOrderId
    );

    if (!wo) {
      return next(new AppError('Work order not found for estimate submission.', 404, 'NOT_FOUND'));
    }

    // Backend calculates official rate card totals (strict compliance rule)
    const verified = calculateVerifiedEstimate(lineItems, req.user.contractorId || wo.contractor_id);
    const requiresDeptHead = verified.totalAmount > DEPT_HEAD_APPROVAL_THRESHOLD;
    const nextStatus = requiresDeptHead ? 'AWAITING_DEPT_HEAD' : 'WORK_ORDER_CREATED';

    const now = new Date().toISOString();
    const actorName = req.user.name || 'Contractor Lead';
    const note = `Estimate of ₹${verified.totalAmount.toLocaleString()} submitted by ${actorName}. ${
      requiresDeptHead ? 'Threshold exceeded (> ₹10k) → Forwarded to Dept Head for approval.' : 'Ready for execution.'
    }`;

    const updatedWo = db.update('work_orders', wo.id, {
      status: nextStatus,
      estimate_amount: verified.totalAmount,
      line_items: verified.lineItems,
      requires_dept_head: requiresDeptHead,
      estimate_submitted_at: now,
      estimate_submitted_by: actorName,
    });

    const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    if (complaint) {
      db.update('complaints', complaint.id, {
        status: nextStatus,
        estimateAmount: verified.totalAmount,
        history: [
          ...(complaint.history || []),
          { stage: nextStatus, timestamp: now, actor: actorName, note },
        ],
      });
    }

    db.logAudit({
      township_id: wo.township_id,
      entity_type: 'WORK_ORDER',
      entity_id: wo.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'ESTIMATE_SUBMITTED',
      from_state: wo.status,
      to_state: nextStatus,
      notes: note,
    });

    res.status(201).json({
      success: true,
      message: `Estimate submitted: ₹${verified.totalAmount.toLocaleString()}. Status: ${nextStatus}.`,
      data: {
        workOrder: updatedWo,
        estimateTotal: verified.totalAmount,
        requiresDeptHeadApproval: requiresDeptHead,
        lineItems: verified.lineItems,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Update job execution status: ASSIGNED → IN_PROGRESS → COMPLETED
 * @route  PATCH /api/v1/contractor/jobs/:id/status
 * @body   { status: 'IN_PROGRESS' | 'COMPLETED', remarks?: string }
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
export const updateJobStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const normalizedStatus = (status || '').toUpperCase();
    if (!['IN_PROGRESS', 'COMPLETED', 'REWORK'].includes(normalizedStatus)) {
      return next(
        new AppError("Status must be 'IN_PROGRESS', 'COMPLETED', or 'REWORK'.", 400, 'VALIDATION_ERROR')
      );
    }

    const wo = db.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_code === id || w.work_order_number === id || w.complaint_id === id
    );

    if (!wo) {
      return next(new AppError(`Work order '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    const now = new Date().toISOString();
    const actorName = req.user.name || 'Contractor Lead';

    // Status mapping: When contractor marks COMPLETED, complaint goes to PENDING_VERIFICATION for citizen sign-off
    const woNextStatus = normalizedStatus === 'COMPLETED' ? 'COMPLETED' : normalizedStatus;
    const complaintNextStatus = normalizedStatus === 'COMPLETED' ? 'PENDING_VERIFICATION' : normalizedStatus;

    const note = `Contractor ${actorName} marked work '${normalizedStatus}'. ${remarks ? `Remarks: "${remarks}"` : ''}`;

    const updatedWo = db.update('work_orders', wo.id, {
      status: woNextStatus,
      completion_remarks: remarks || null,
      completed_at: normalizedStatus === 'COMPLETED' ? now : wo.completed_at,
    });

    const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    if (complaint) {
      db.update('complaints', complaint.id, {
        status: complaintNextStatus,
        completionRemarks: remarks || null,
        completedAt: normalizedStatus === 'COMPLETED' ? now : complaint.completedAt,
        history: [
          ...(complaint.history || []),
          { stage: complaintNextStatus, timestamp: now, actor: actorName, note },
        ],
      });
    }

    db.logAudit({
      township_id: wo.township_id,
      entity_type: 'WORK_ORDER',
      entity_id: wo.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: `CONTRACTOR_${normalizedStatus}`,
      from_state: wo.status,
      to_state: woNextStatus,
      notes: note,
    });

    res.status(200).json({
      success: true,
      message: `Work status transitioned to ${normalizedStatus}.`,
      data: {
        workOrder: updatedWo,
        complaintStatus: complaintNextStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Upload before or after repair evidence photos
 * @route  POST /api/v1/contractor/evidence
 * @body   { workOrderId, complaintId, evidenceType: 'BEFORE' | 'AFTER', photos: Array, caption?: string }
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
export const uploadEvidence = async (req, res, next) => {
  try {
    const { workOrderId, complaintId, evidenceType = 'AFTER', photos, fileUrl, caption } = req.body;

    const photoList = Array.isArray(photos) ? photos : fileUrl ? [fileUrl] : [];
    if (photoList.length === 0) {
      return next(new AppError('At least one evidence photo URL or file is required.', 400, 'VALIDATION_ERROR'));
    }

    const type = (evidenceType || 'AFTER').toUpperCase();
    const now = new Date().toISOString();

    let targetComplaintId = complaintId;
    if (!targetComplaintId && workOrderId) {
      const wo = db.findOne(
        'work_orders',
        (w) => w.id === workOrderId || w.work_order_code === workOrderId || w.work_order_number === workOrderId
      );
      if (wo) targetComplaintId = wo.complaint_id;
    }

    const createdEvidence = [];
    for (const url of photoList) {
      const rec = db.insert('complaint_evidence', {
        complaint_id: targetComplaintId || workOrderId,
        evidence_type: type,
        file_url: url,
        caption: caption || `${type} repair photo evidence`,
        uploaded_by: req.user.id,
        created_at: now,
      });
      createdEvidence.push(rec);
    }

    // Attach to complaint object
    if (targetComplaintId) {
      const complaint = db.findOne('complaints', (c) => c.id === targetComplaintId || c.complaint_code === targetComplaintId);
      if (complaint) {
        const updateField = type === 'AFTER' ? 'afterPhotos' : 'beforePhotos';
        const existing = Array.isArray(complaint[updateField]) ? complaint[updateField] : [];
        db.update('complaints', complaint.id, {
          [updateField]: [...existing, ...photoList],
        });
      }
    }

    db.logAudit({
      township_id: req.user.townshipId,
      entity_type: 'EVIDENCE',
      entity_id: complaintId || workOrderId,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'EVIDENCE_UPLOADED',
      from_state: type,
      to_state: type,
      notes: `Uploaded ${photoList.length} ${type} photos.`,
    });

    res.status(201).json({
      success: true,
      message: `${type} evidence proof recorded successfully.`,
      data: createdEvidence,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getAssignedJobs,
  getJobById,
  submitSiteInspection,
  submitEstimate,
  updateJobStatus,
  uploadEvidence,
};
