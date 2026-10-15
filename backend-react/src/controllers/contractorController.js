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
import { getApprovalThresholds, requiresDeptHeadApproval } from '../services/approvalService.js';

const getUserTownshipId = (user) => user.township_id;
const getUserContractorId = (user) => user.contractor_id;

const normalizeId = (value = '') => String(value).trim();

const findWorkOrderByReference = (id, complaintId = null) => {
  const targetId = normalizeId(id);
  const targetComplaintId = normalizeId(complaintId);
  const lookupRef = targetComplaintId || targetId;
  const comp = lookupRef
    ? db.findOne('complaints', (c) => c.id === lookupRef || c.complaint_code === lookupRef)
    : null;
  const compId = comp ? comp.id : null;
  const compCode = comp ? comp.complaint_code : null;

  return db.findOne(
    'work_orders',
    (w) =>
      w.id === targetId ||
      w.work_order_number === targetId ||
      w.work_order_code === targetId ||
      (targetComplaintId && (w.complaint_id === targetComplaintId || (compId && w.complaint_id === compId) || (compCode && w.complaint_code === compCode))) ||
      (targetId && (w.complaint_id === targetId || (compId && w.complaint_id === compId) || (compCode && w.complaint_code === compCode)))
  );
};

const assertContractorWorkOrderAccess = (req, wo) => {
  if (!wo) {
    throw new AppError('Work order not found.', 404, 'NOT_FOUND');
  }

  const township_id = getUserTownshipId(req.user);
  if (township_id && wo.township_id && wo.township_id !== township_id) {
    throw new AppError('Cross-township work order access is forbidden.', 403, 'FORBIDDEN');
  }
};

const isSafeEvidenceUrl = (url) => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('/uploads/')) return !trimmed.includes('..') && !trimmed.includes('\\');
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * @desc   Get all jobs / work orders assigned to the contractor
 * @route  GET /api/v1/contractor/jobs
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
export const getAssignedJobs = async (req, res, next) => {
  try {
    if (typeof db.refreshTablesFromPostgres === 'function') {
      await db.refreshTablesFromPostgres();
    }
    const contractor_id = getUserContractorId(req.user);
    const township_id = getUserTownshipId(req.user);
    const { status } = req.query;

    const workOrders = db.findAll('work_orders', (wo) => {
      if (township_id && wo.township_id && wo.township_id !== township_id) return false;
      const matchContractor = req.user.role === 'TOWNSHIP_COO'
        ? true
        : Boolean(contractor_id && wo.contractor_id === contractor_id);
      const matchStatus = !status || wo.status === status.toUpperCase();
      return matchContractor && matchStatus;
    });

    const enriched = workOrders.map((wo) => {
      const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id || c.complaint_code === wo.complaint_id);
      const contractor = db.findOne('contractors', (cnt) => cnt.id === wo.contractor_id);
      const evidence = db.findAll('complaint_evidence', (ev) => ev.complaint_id === wo.complaint_id);
      const beforeEvidence = evidence.filter((e) => (e.evidence_type || e.type) === 'BEFORE').map((e) => e.file_url || e.fileUrl);
      const afterEvidence = evidence.filter((e) => (e.evidence_type || e.type) === 'AFTER').map((e) => e.file_url || e.fileUrl);

      const estimatedCost = Number(wo.estimated_cost || 0);
      const actualCost = wo.actual_cost !== null && wo.actual_cost !== undefined
        ? Number(wo.actual_cost)
        : (wo.status === 'COMPLETED' ? estimatedCost : null);
      const wo_number = wo.work_order_number || wo.id;
      const complaint_code = complaint?.complaint_code || complaint?.id;

      return {
        id: wo.id,
        work_order_number: wo_number,
        workOrderId: wo_number,
        workOrderCode: wo_number,
        complaint_id: wo.complaint_id,
        complaintId: wo.complaint_id,
        complaint_code,
        complaintCode: complaint_code,
        title: complaint?.title || 'Field Work Order',
        category: complaint?.category || 'General',
        subcategory: complaint?.subcategory || '',
        subCategory: complaint?.subcategory || '',
        severity: complaint?.severity || wo.priority || 'Medium',
        priority: wo.priority || complaint?.severity || 'Medium',
        status: wo.status,
        complaint_status: complaint?.status || wo.status,
        complaintStatus: complaint?.status || wo.status,
        estimated_cost: estimatedCost,
        estimateAmount: estimatedCost,
        estimatedCost,
        actual_cost: actualCost,
        actualCost,
        moneyEstimated: estimatedCost,
        moneyUsed: actualCost !== null ? actualCost : 0,
        line_items: wo.line_items || [],
        lineItems: wo.line_items || [],
        special_instructions: wo.special_instructions || '',
        specialInstructions: wo.special_instructions || '',
        sla_deadline: complaint?.sla_deadline || wo.due_at,
        slaDeadline: complaint?.sla_deadline || wo.due_at,
        created_at: wo.created_at,
        createdAt: wo.created_at,
        location: complaint?.location || {
          sector: complaint?.sector || 'Sector 54',
          block: complaint?.block || 'Block A',
          street: complaint?.street || 'Gulmohar Marg',
          asset_id: complaint?.asset_id || 'ASSET-GEN-01',
          assetId: complaint?.asset_id || 'ASSET-GEN-01',
          location_details: complaint?.location_details || '',
          landmark: complaint?.location_details || '',
        },
        description: complaint?.description || wo.special_instructions || '',
        reported_by: complaint?.reported_by || 'Dr. Arvind Swaminathan',
        reportedBy: complaint?.reported_by || { name: 'Dr. Arvind Swaminathan', role: 'RWA Secretary' },
        beforePhotos: (complaint?.beforePhotos && complaint.beforePhotos.length > 0) ? complaint.beforePhotos : beforeEvidence,
        afterPhotos: (complaint?.afterPhotos && complaint.afterPhotos.length > 0) ? complaint.afterPhotos : afterEvidence,
        inspection_notes: wo.inspection_notes || null,
        inspectionNotes: wo.inspection_notes || null,
        inspected_at: wo.inspected_at || null,
        inspectedAt: wo.inspected_at || null,
        inspected_by: wo.inspected_by || null,
        inspectedBy: wo.inspected_by || null,
        completion_remarks: wo.completion_remarks || null,
        completionRemarks: wo.completion_remarks || null,
        completed_at: wo.completed_at || null,
        completedAt: wo.completed_at || null,
        evidence,
        company_name: contractor?.company_name || 'Assigned AMC Partner',
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

    const wo = findWorkOrderByReference(id);

    if (!wo) {
      return next(new AppError(`Work order '${id}' not found.`, 404, 'NOT_FOUND'));
    }
    assertContractorWorkOrderAccess(req, wo);

    const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    const evidence = db.findAll('complaint_evidence', (ev) => ev.complaint_id === wo.complaint_id);
    const amcRates = db.findAll('amc_rates');

    const estimatedCost = Number(wo.estimated_cost || wo.estimate_amount || 0);
    const actualCost = wo.actual_cost !== null && wo.actual_cost !== undefined
      ? Number(wo.actual_cost)
      : (wo.status === 'COMPLETED' ? estimatedCost : null);

    res.status(200).json({
      success: true,
      data: {
        id: wo.id,
        workOrderId: wo.work_order_code || wo.work_order_number || wo.id,
        workOrderCode: wo.work_order_code || wo.work_order_number || wo.id,
        complaintId: wo.complaint_id,
        status: wo.status,
        priority: wo.priority,
        estimateAmount: estimatedCost,
        estimatedCost,
        actualCost,
        moneyEstimated: estimatedCost,
        moneyUsed: actualCost !== null ? actualCost : 0,
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
    const workOrderId = req.body.work_order_id || req.body.workOrderId || req.body.id;
    const complaintId = req.body.complaint_id || req.body.complaintId;
    const inspectionNotes = req.body.inspection_notes || req.body.inspectionNotes;
    const severityConfirmed = req.body.severity_confirmed ?? req.body.severityConfirmed;

    const wo = findWorkOrderByReference(workOrderId, complaintId);

    if (!wo) {
      return next(new AppError('Valid workOrderId or complaintId is required.', 404, 'NOT_FOUND'));
    }
    assertContractorWorkOrderAccess(req, wo);

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
    const workOrderId = req.body.work_order_id || req.body.workOrderId || req.body.id;
    const complaintId = req.body.complaint_id || req.body.complaintId;
    const lineItems = req.body.line_items || req.body.lineItems;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return next(new AppError('Estimate must include at least one AMC service line item.', 400, 'VALIDATION_ERROR'));
    }

    const wo = findWorkOrderByReference(workOrderId, complaintId);

    if (!wo) {
      return next(new AppError('Work order not found for estimate submission.', 404, 'NOT_FOUND'));
    }
    assertContractorWorkOrderAccess(req, wo);
    if (!wo.inspection_notes || !wo.inspected_at) {
      return next(new AppError('Site inspection must be submitted before creating an AMC estimate.', 409, 'INSPECTION_REQUIRED'));
    }

    // Backend calculates official rate card totals (strict compliance rule)
    const verified = calculateVerifiedEstimate(lineItems, getUserContractorId(req.user) || wo.contractor_id);
    const requiresDeptHead = requiresDeptHeadApproval(verified.totalAmount);
    const deptHeadThreshold = getApprovalThresholds().CLERK_LIMIT;
    const nextStatus = requiresDeptHead ? 'AWAITING_DEPT_HEAD' : 'WORK_ORDER_CREATED';

    const now = new Date().toISOString();
    const actorName = req.user.name || 'Contractor Lead';
    const note = `Estimate of ₹${verified.totalAmount.toLocaleString()} submitted by ${actorName}. ${
      requiresDeptHead ? `Threshold exceeded (> ₹${deptHeadThreshold.toLocaleString()}) → Forwarded to Dept Head for approval.` : 'Ready for execution.'
    }`;

    const updatedWo = db.update('work_orders', wo.id, {
      status: nextStatus,
      estimate_amount: verified.totalAmount,
      estimated_cost: verified.totalAmount,
      line_items: verified.lineItems,
      requires_dept_head: requiresDeptHead,
      estimate_submitted_at: now,
      estimate_submitted_by: actorName,
      rejection_notes: null,
      rejected_at: null,
      rejected_by: null,
      revision_notes: null,
      revision_requested_at: null,
      revision_requested_by: null,
    });

    // Persist into relational estimates table if present
    const estimateRecord = db.insert('estimates', {
      work_order_id: wo.id,
      contractor_id: getUserContractorId(req.user) || wo.contractor_id,
      total_amount: verified.totalAmount,
      status: requiresDeptHead ? 'SUBMITTED' : 'APPROVED',
      submitted_at: now,
      submitted_by: actorName,
    });

    if (db.query) {
      await db.query(
        `INSERT INTO estimates (id, work_order_id, contractor_id, total_amount, status, submitted_at, submitted_by) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
        [estimateRecord.id, wo.id, getUserContractorId(req.user) || wo.contractor_id, verified.totalAmount, requiresDeptHead ? 'SUBMITTED' : 'APPROVED', now, actorName]
      ).catch(() => {});
    }

    if (Array.isArray(verified.lineItems)) {
      for (const item of verified.lineItems) {
        const matchedRate = db.findOne('amc_rates', (r) => r.item_code === item.itemCode || r.id === item.rateCardId);
        db.insert('estimate_items', {
          estimate_id: estimateRecord.id,
          amc_rate_id: matchedRate ? matchedRate.id : null,
          description: item.service || item.description || item.itemName || 'Remediation Service',
          unit: item.unit || 'Unit',
          quantity: Number(item.qty || item.quantity || 1),
          rate_snapshot: Number(item.officialRate || item.rate || 500),
          amount: Number(item.totalAmount || item.amount || ((item.qty || 1) * (item.rate || 500))),
          rate_card_id: item.rateCardId || item.itemCode,
          rate: item.rate || item.officialRate,
          total_price: item.totalAmount || item.amount,
        });
      }
    }

    const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    if (complaint) {
      db.update('complaints', complaint.id, {
        status: nextStatus,
        estimateAmount: verified.totalAmount,
        rejection_reason: null,
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
        estimateId: estimateRecord.id,
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

    const normalizedStatus = (status || '').toUpperCase() === 'REWORK' ? 'REWORK_REQUESTED' : (status || '').toUpperCase();
    if (!['IN_PROGRESS', 'COMPLETED', 'REWORK_REQUESTED'].includes(normalizedStatus)) {
      return next(
        new AppError("Status must be 'IN_PROGRESS', 'COMPLETED', or 'REWORK_REQUESTED'.", 400, 'VALIDATION_ERROR')
      );
    }

    const wo = findWorkOrderByReference(id);

    if (!wo) {
      return next(new AppError(`Work order '${id}' not found.`, 404, 'NOT_FOUND'));
    }
    assertContractorWorkOrderAccess(req, wo);

    const currentStatus = (wo.status || '').toUpperCase();
    if (normalizedStatus === 'IN_PROGRESS') {
      const startableStatuses = ['ASSIGNED', 'APPROVED', 'WORK_ORDER_CREATED', 'REWORK_REQUESTED'];
      if (!startableStatuses.includes(currentStatus)) {
        return next(new AppError(`Cannot start work from status '${wo.status}'.`, 409, 'INVALID_STATUS_TRANSITION'));
      }
      if (!wo.inspection_notes || !wo.inspected_at) {
        return next(new AppError('Site inspection is required before work can start.', 409, 'INSPECTION_REQUIRED'));
      }
    }

    if (normalizedStatus === 'COMPLETED') {
      const completableStatuses = ['IN_PROGRESS', 'REWORK_REQUESTED'];
      if (!completableStatuses.includes(currentStatus)) {
        return next(new AppError(`Cannot complete work from status '${wo.status}'.`, 409, 'INVALID_STATUS_TRANSITION'));
      }
      const afterEvidence = db.findAll(
        'complaint_evidence',
        (ev) => ev.complaint_id === wo.complaint_id && (ev.evidence_type || ev.type) === 'AFTER'
      );
      if (afterEvidence.length === 0) {
        return next(new AppError('After-repair evidence must be uploaded before marking work completed.', 409, 'AFTER_EVIDENCE_REQUIRED'));
      }
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

    let createdInvoice = null;
    if (normalizedStatus === 'COMPLETED') {
      const estimatedCost = Number(wo.estimated_cost || wo.estimate_amount || wo.estimatedAmount || 0);
      if (estimatedCost <= 0) {
        return next(new AppError('Approved estimate amount is required before completion can be invoiced.', 409, 'APPROVED_ESTIMATE_REQUIRED'));
      }
      const requestedActualCost = Number(req.body.actualCost || req.body.actual_cost || req.body.billedAmount || estimatedCost);
      if (Number.isFinite(requestedActualCost) && requestedActualCost > estimatedCost) {
        return next(new AppError('Completion billing cannot exceed the approved AMC estimate. Submit a revised estimate for additional work.', 409, 'BILLING_EXCEEDS_ESTIMATE'));
      }
      const actualCost = estimatedCost;
      const variance = actualCost - estimatedCost;

      // Update work order with actual cost
      db.update('work_orders', wo.id, {
        actual_cost: actualCost,
      });

      // Find or create invoice for Finance Audit Check
      let existingInvoice = db.findOne('invoices', (inv) => inv.work_order_id === wo.id);
      const invoiceCount = db.findAll('invoices').length + 1;
      const invoiceCode = `INV-2026-${String(invoiceCount).padStart(3, '0')}`;
      const invoiceNum = `VT-INV/2026/${String(invoiceCount).padStart(3, '0')}`;

      if (existingInvoice) {
        createdInvoice = db.update('invoices', existingInvoice.id, {
          status: 'PENDING_AUDIT',
          subtotal: actualCost,
          total_amount: actualCost,
          approved_estimate_amount: estimatedCost,
          variance_amount: variance,
          rate_card_match: variance === 0,
          variance_reason: variance > 0 ? (req.body.varianceReason || 'Site condition adjustments during execution') : null,
          updated_at: now,
        });
      } else {
        createdInvoice = db.insert('invoices', {
          invoice_code: invoiceCode,
          township_id: wo.township_id || req.user.township_id || 'b0000000-0000-0000-0000-000000000001',
          contractor_id: wo.contractor_id || getUserContractorId(req.user),
          work_order_id: wo.id,
          invoice_number: invoiceNum,
          invoice_date: now.split('T')[0],
          subtotal: actualCost,
          tax: 0.0,
          total_amount: actualCost,
          approved_estimate_amount: estimatedCost,
          variance_amount: variance,
          rate_card_match: variance === 0,
          variance_reason: variance > 0 ? (req.body.varianceReason || 'Site condition adjustments during execution') : null,
          status: 'PENDING_AUDIT',
          created_at: now,
        });

        if (Array.isArray(wo.line_items) && wo.line_items.length > 0) {
          wo.line_items.forEach((item) => {
            db.insert('invoice_items', {
              invoice_id: createdInvoice.id,
              description: item.description || item.service || 'AMC Maintenance Service',
              unit: item.unit || 'job',
              quantity: item.quantity || item.qty || 1,
              rate: item.rate || item.unitCost || actualCost,
              amount: item.amount || item.totalAmount || actualCost,
            });
          });
        } else {
          db.insert('invoice_items', {
            invoice_id: createdInvoice.id,
            description: wo.special_instructions || complaint?.title || 'Contractor Work Order Execution',
            unit: 'job',
            quantity: 1,
            rate: actualCost,
            amount: actualCost,
          });
        }
      }
    }

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
        workOrder: db.findById('work_orders', wo.id),
        invoice: createdInvoice,
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
    const workOrderId = req.body.work_order_id || req.body.workOrderId || req.body.id;
    const complaintId = req.body.complaint_id || req.body.complaintId;
    const evidenceType = req.body.evidence_type || req.body.evidenceType || 'AFTER';
    const { photos, fileUrl, caption } = req.body;

    const photoList = Array.isArray(photos) ? photos : fileUrl ? [fileUrl] : [];
    if (photoList.length === 0) {
      return next(new AppError('At least one evidence photo URL or file is required.', 400, 'VALIDATION_ERROR'));
    }

    const type = (evidenceType || 'AFTER').toUpperCase();
    const now = new Date().toISOString();

    const wo = findWorkOrderByReference(workOrderId, complaintId);
    if (!wo) {
      return next(new AppError('Valid workOrderId or complaintId is required for evidence upload.', 404, 'NOT_FOUND'));
    }
    assertContractorWorkOrderAccess(req, wo);

    let targetComplaintId = complaintId || wo.complaint_id;
    const safePhotoList = photoList.map((url) => String(url).trim()).filter(isSafeEvidenceUrl);
    if (safePhotoList.length !== photoList.length) {
      return next(new AppError('Evidence photos must be safe http(s) URLs or server upload paths.', 400, 'INVALID_EVIDENCE_URL'));
    }

    const createdEvidence = [];
    for (const url of safePhotoList) {
      const rec = db.insert('complaint_evidence', {
        complaint_id: targetComplaintId,
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
          [updateField]: [...existing, ...safePhotoList],
        });
      }
    }

    db.logAudit({
      township_id: wo.township_id || getUserTownshipId(req.user),
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
