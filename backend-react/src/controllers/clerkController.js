/**
 * clerkController.js — TIMS Desk Clerk Backend (Member 2)
 *
 * Handles:
 *   1. Triage    — open complaint for review (REPORTED → UNDER_REVIEW)
 *   2. Validate  — approve complaint (UNDER_REVIEW → VALIDATED)
 *   3. Reject    — reject complaint  (UNDER_REVIEW → REJECTED)
 *   4. Create WO — build work order from AMC rate cards
 *                  • estimate <= 10,000 → WORK_ORDER_CREATED
 *                  • estimate >  10,000 → AWAITING_DEPT_HEAD
 *   5. List WOs  — all work orders for this township
 *   6. Get WO    — single work order detail
 *
 * All state transitions are logged to audit_logs.
 * All data is persisted in the shared in-memory store.
 */

import inMemoryDb from '../config/inMemoryDb.js';
import { AppError } from '../middleware/error.js';
import { findNearbyDuplicates } from '../services/duplicateService.js';

/** ₹ threshold above which Dept Head approval is required */
const DEPT_HEAD_THRESHOLD = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateWoCode — creates a unique WO business code like WO-2026-4921
 */
function generateWoCode() {
  const year   = new Date().getFullYear();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `WO-${year}-${suffix}`;
}

/**
 * formatWoResponse — clean shape returned to the client for work orders
 */
function formatWoResponse(wo) {
  if (!wo) return null;

  // Attach contractor details if available
  const contractor = wo.contractor_id
    ? inMemoryDb.findOne('contractors', (c) => c.id === wo.contractor_id)
    : null;

  return {
    id:                   wo.id,
    workOrderCode:        wo.work_order_code,
    complaintId:          wo.complaint_id,
    status:               wo.status,
    priority:             wo.priority,
    estimateAmount:       wo.estimate_amount,
    requiresDeptHead:     wo.requires_dept_head,
    specialInstructions:  wo.special_instructions,
    lineItems:            wo.line_items || [],
    contractor: contractor
      ? {
          id:            contractor.id,
          name:          contractor.company_name,
          contactPerson: contractor.contact_person,
          phone:         contractor.phone,
          email:         contractor.email,
        }
      : null,
    createdBy:  wo.created_by_name,
    createdAt:  wo.created_at,
    updatedAt:  wo.updated_at || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Open complaint for triage (REPORTED → UNDER_REVIEW)
 * @route  PATCH /api/v1/clerk/complaints/:id/triage
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const triageComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const complaint = inMemoryDb.findById('complaints', id);
    if (!complaint) {
      return next(new AppError(`Complaint '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    // Guard: only REPORTED complaints can be opened for triage
    if (complaint.status !== 'REPORTED') {
      return next(
        new AppError(
          `Complaint is already '${complaint.status}'. Only REPORTED complaints can be triaged.`,
          409,
          'INVALID_TRANSITION'
        )
      );
    }

    const now  = new Date().toISOString();
    const note = `Desk Clerk ${req.user.name} opened complaint for triage review.`;

    // Update status + append history entry
    const updated = inMemoryDb.update('complaints', complaint.id, {
      status: 'UNDER_REVIEW',
      history: [
        ...(complaint.history || []),
        { stage: 'UNDER_REVIEW', timestamp: now, actor: req.user.name, note },
      ],
    });

    // Audit log
    inMemoryDb.logAudit({
      township_id:  complaint.township_id,
      entity_type:  'COMPLAINT',
      entity_id:    complaint.id,
      actor_id:     req.user.id,
      actor_role:   req.user.role,
      action:       'TRIAGE_OPENED',
      from_state:   'REPORTED',
      to_state:     'UNDER_REVIEW',
      notes:        note,
    });

    res.status(200).json({
      success: true,
      message: `Complaint ${complaint.complaint_code || id} is now UNDER_REVIEW.`,
      data:    updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Validate complaint (UNDER_REVIEW → VALIDATED)
 * @route  PATCH /api/v1/clerk/complaints/:id/validate
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const validateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const complaint = inMemoryDb.findById('complaints', id);
    if (!complaint) {
      return next(new AppError(`Complaint '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    if (complaint.status !== 'UNDER_REVIEW') {
      return next(
        new AppError(
          `Complaint must be UNDER_REVIEW to validate. Current status: '${complaint.status}'.`,
          409,
          'INVALID_TRANSITION'
        )
      );
    }

    const now  = new Date().toISOString();
    const note = `Validated by Desk Clerk ${req.user.name}. All fields verified. Ready for Work Order creation.`;

    const updated = inMemoryDb.update('complaints', complaint.id, {
      status: 'VALIDATED',
      history: [
        ...(complaint.history || []),
        { stage: 'VALIDATED', timestamp: now, actor: req.user.name, note },
      ],
    });

    inMemoryDb.logAudit({
      township_id:  complaint.township_id,
      entity_type:  'COMPLAINT',
      entity_id:    complaint.id,
      actor_id:     req.user.id,
      actor_role:   req.user.role,
      action:       'VALIDATED',
      from_state:   'UNDER_REVIEW',
      to_state:     'VALIDATED',
      notes:        note,
    });

    res.status(200).json({
      success: true,
      message: `Complaint ${complaint.complaint_code || id} validated. Proceed to create a Work Order.`,
      data:    updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Reject complaint (UNDER_REVIEW → REJECTED)
 * @route  PATCH /api/v1/clerk/complaints/:id/reject
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 * @body   { reason: string, remarks?: string }
 */
export const rejectComplaint = async (req, res, next) => {
  try {
    const { id }              = req.params;
    const { reason, remarks } = req.body;

    if (!reason) {
      return next(new AppError('A rejection reason is required.', 400, 'VALIDATION_ERROR'));
    }

    const complaint = inMemoryDb.findById('complaints', id);
    if (!complaint) {
      return next(new AppError(`Complaint '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    if (complaint.status !== 'UNDER_REVIEW') {
      return next(
        new AppError(
          `Complaint must be UNDER_REVIEW to reject. Current status: '${complaint.status}'.`,
          409,
          'INVALID_TRANSITION'
        )
      );
    }

    const now  = new Date().toISOString();
    const note = `Rejected by ${req.user.name}. Reason: "${reason}". Remarks: "${remarks || 'None'}".`;

    const updated = inMemoryDb.update('complaints', complaint.id, {
      status:           'REJECTED',
      rejection_reason: reason,
      rejection_remarks: remarks || null,
      history: [
        ...(complaint.history || []),
        { stage: 'REJECTED', timestamp: now, actor: req.user.name, note },
      ],
    });

    inMemoryDb.logAudit({
      township_id:  complaint.township_id,
      entity_type:  'COMPLAINT',
      entity_id:    complaint.id,
      actor_id:     req.user.id,
      actor_role:   req.user.role,
      action:       'REJECTED',
      from_state:   'UNDER_REVIEW',
      to_state:     'REJECTED',
      notes:        note,
    });

    res.status(200).json({
      success: true,
      message: `Complaint ${complaint.complaint_code || id} rejected.`,
      data:    updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Create Work Order from a VALIDATED complaint
 * @route  POST /api/v1/clerk/work-orders
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 *
 * @body {
 *   complaintId:         string    (required)
 *   contractorId:        string    (required)
 *   lineItems:           [{ rateCardId: string, qty: number }]  (required, min 1)
 *   priority:            'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW'
 *   specialInstructions: string    (optional)
 * }
 *
 * Business rule:
 *   total estimate > DEPT_HEAD_THRESHOLD (₹10,000)
 *     → status = AWAITING_DEPT_HEAD  (complaint status also flipped)
 *   else
 *     → status = WORK_ORDER_CREATED
 */
export const createWorkOrder = async (req, res, next) => {
  try {
    const {
      complaintId,
      contractorId,
      lineItems       = [],
      priority        = 'MEDIUM',
      specialInstructions = '',
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!complaintId) {
      return next(new AppError('complaintId is required.', 400, 'VALIDATION_ERROR'));
    }
    if (!contractorId) {
      return next(new AppError('contractorId is required.', 400, 'VALIDATION_ERROR'));
    }
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return next(new AppError('At least one line item (rateCardId + qty) is required.', 400, 'VALIDATION_ERROR'));
    }

    // ── Resolve complaint ─────────────────────────────────────────────────
    const complaint = inMemoryDb.findById('complaints', complaintId);
    if (!complaint) {
      return next(new AppError(`Complaint '${complaintId}' not found.`, 404, 'NOT_FOUND'));
    }
    if (complaint.status !== 'VALIDATED') {
      return next(
        new AppError(
          `Complaint must be VALIDATED before a Work Order can be created. Current: '${complaint.status}'.`,
          409,
          'INVALID_TRANSITION'
        )
      );
    }

    // ── Resolve contractor ────────────────────────────────────────────────
    const contractor = inMemoryDb.findOne('contractors', (c) => c.id === contractorId);
    if (!contractor) {
      return next(new AppError(`Contractor '${contractorId}' not found.`, 404, 'NOT_FOUND'));
    }

    // ── Resolve AMC rate cards + compute estimate ──────────────────────────
    let estimateTotal = 0;
    const resolvedLines = [];

    for (const item of lineItems) {
      if (!item.rateCardId) continue;
      const card = inMemoryDb.findOne('amc_rates', (r) => r.id === item.rateCardId);
      if (!card) {
        return next(new AppError(`AMC Rate Card '${item.rateCardId}' not found.`, 404, 'NOT_FOUND'));
      }
      const qty   = Number(item.qty) || 1;
      const total = card.rate * qty;
      estimateTotal += total;
      resolvedLines.push({
        rateCardId:  card.id,
        service:     card.service,
        unit:        card.unit,
        unitCost:    card.rate,
        qty,
        total,
      });
    }

    if (estimateTotal === 0) {
      return next(new AppError('Estimate total is 0. Please add valid line items with quantities.', 400, 'VALIDATION_ERROR'));
    }

    // ── Business rule: Dept Head threshold ───────────────────────────────
    const requiresDeptHead = estimateTotal > DEPT_HEAD_THRESHOLD;
    const woStatus         = requiresDeptHead ? 'AWAITING_DEPT_HEAD' : 'WORK_ORDER_CREATED';
    const woCode           = generateWoCode();
    const now              = new Date().toISOString();

    // ── Insert work order ─────────────────────────────────────────────────
    const workOrder = inMemoryDb.insert('work_orders', {
      work_order_code:      woCode,
      township_id:          complaint.township_id,
      complaint_id:         complaint.id,
      department_id:        complaint.department_id,
      contractor_id:        contractorId,
      assigned_by:          req.user.id,
      priority:             priority.toUpperCase(),
      status:               woStatus,
      estimate_amount:      estimateTotal,
      requires_dept_head:   requiresDeptHead,
      special_instructions: specialInstructions,
      line_items:           resolvedLines,
      created_by_name:      `${req.user.name} (Desk Clerk)`,
      created_at:           now,
    });

    // ── Flip complaint status ─────────────────────────────────────────────
    const complaintNote = requiresDeptHead
      ? `WO ${woCode} created, forwarded to Dept Head (estimate ₹${estimateTotal.toLocaleString()} > ₹${DEPT_HEAD_THRESHOLD.toLocaleString()} threshold). Contractor: ${contractor.company_name}.`
      : `WO ${woCode} dispatched to ${contractor.company_name}. Estimate: ₹${estimateTotal.toLocaleString()}. Priority: ${priority.toUpperCase()}.`;

    inMemoryDb.update('complaints', complaint.id, {
      status:      woStatus,
      work_order_id: workOrder.id,
      work_order_code: woCode,
      assigned_contractor_id: contractorId,
      assigned_contractor_name: contractor.company_name,
      estimate_amount: estimateTotal,
      history: [
        ...(complaint.history || []),
        { stage: woStatus, timestamp: now, actor: req.user.name, note: complaintNote },
      ],
    });

    // ── Audit log ─────────────────────────────────────────────────────────
    inMemoryDb.logAudit({
      township_id:  complaint.township_id,
      entity_type:  'WORK_ORDER',
      entity_id:    workOrder.id,
      actor_id:     req.user.id,
      actor_role:   req.user.role,
      action:       woStatus,
      from_state:   'VALIDATED',
      to_state:     woStatus,
      notes:        complaintNote,
    });

    res.status(201).json({
      success: true,
      message: requiresDeptHead
        ? `Work Order ${woCode} forwarded to Dept Head for approval (estimate exceeds ₹${DEPT_HEAD_THRESHOLD.toLocaleString()}).`
        : `Work Order ${woCode} dispatched to ${contractor.company_name} successfully.`,
      data: formatWoResponse(workOrder),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   List all work orders for the current township
 * @route  GET /api/v1/clerk/work-orders
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 * @query  status, priority, contractorId
 */
export const getWorkOrders = async (req, res, next) => {
  try {
    const { status, priority, contractorId } = req.query;
    const townshipId = req.user.townshipId;

    const workOrders = inMemoryDb.find('work_orders', (wo) => {
      // Township isolation
      if (townshipId && wo.township_id !== townshipId) return false;
      // Optional filters
      if (status       && wo.status.toUpperCase()     !== status.toUpperCase())       return false;
      if (priority     && wo.priority.toUpperCase()   !== priority.toUpperCase())     return false;
      if (contractorId && wo.contractor_id            !== contractorId)               return false;
      return true;
    });

    res.status(200).json({
      success: true,
      count:   workOrders.length,
      data:    workOrders.map(formatWoResponse),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get a single work order by ID or WO code
 * @route  GET /api/v1/clerk/work-orders/:id
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const getWorkOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find by UUID or by WO code (e.g. WO-2026-4921)
    const wo = inMemoryDb.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_code === id
    );

    if (!wo) {
      return next(new AppError(`Work Order '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    // Township isolation
    if (req.user.townshipId && wo.township_id !== req.user.townshipId) {
      return next(new AppError('Cross-township access forbidden.', 403, 'FORBIDDEN'));
    }

    // Fetch associated complaint for context
    const complaint = inMemoryDb.findOne('complaints', (c) => c.id === wo.complaint_id);

    res.status(200).json({
      success: true,
      data: {
        ...formatWoResponse(wo),
        complaint: complaint
          ? {
              id:             complaint.id,
              complaintCode:  complaint.complaint_code,
              title:          complaint.title,
              category:       complaint.category,
              status:         complaint.status,
              sector:         complaint.sector,
              block:          complaint.block,
              history:        complaint.history || [],
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get complaints awaiting desk clerk triage & validation
 * @route  GET /api/v1/clerk/triage-queue
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const getTriageQueue = async (req, res, next) => {
  try {
    const townshipId = req.user.townshipId;
    const complaints = inMemoryDb.findAll('complaints', (c) => {
      const matchTownship = !townshipId || c.township_id === townshipId;
      const awaiting = c.status === 'REPORTED' || c.status === 'UNDER_REVIEW';
      return matchTownship && awaiting;
    });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Check potential duplicates using 100m radius & category matching
 * @route  GET /api/v1/clerk/duplicate-check
 * @query  ?complaintId=...
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const checkDuplicates = async (req, res, next) => {
  try {
    const { complaintId } = req.query;
    if (!complaintId) {
      return next(new AppError('Query parameter complaintId is required.', 400, 'VALIDATION_ERROR'));
    }

    const target = inMemoryDb.findOne(
      'complaints',
      (c) => c.id === complaintId || c.complaint_code === complaintId
    );
    if (!target) {
      return next(new AppError(`Complaint '${complaintId}' not found.`, 404, 'NOT_FOUND'));
    }

    const allComplaints = inMemoryDb.findAll('complaints', (c) => {
      return !req.user.townshipId || c.township_id === req.user.townshipId;
    });

    const duplicates = findNearbyDuplicates(target, allComplaints, 100);

    res.status(200).json({
      success: true,
      targetComplaintId: target.id,
      duplicateCount: duplicates.length,
      hasNearbyDuplicate: duplicates.length > 0,
      data: duplicates,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Link duplicate complaint to a master ticket
 * @route  POST /api/v1/clerk/duplicate-link/:id
 * @body   { masterComplaintId: string, notes?: string }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const linkDuplicate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { masterComplaintId, notes } = req.body;

    if (!masterComplaintId) {
      return next(new AppError('masterComplaintId is required in request body.', 400, 'VALIDATION_ERROR'));
    }

    const duplicate = inMemoryDb.findOne('complaints', (c) => c.id === id || c.complaint_code === id);
    if (!duplicate) {
      return next(new AppError(`Duplicate complaint '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    const master = inMemoryDb.findOne(
      'complaints',
      (c) => c.id === masterComplaintId || c.complaint_code === masterComplaintId
    );
    if (!master) {
      return next(new AppError(`Master complaint '${masterComplaintId}' not found.`, 404, 'NOT_FOUND'));
    }

    const now = new Date().toISOString();
    const updated = inMemoryDb.update('complaints', duplicate.id, {
      status: 'DUPLICATE_LINKED',
      master_complaint_id: master.id,
      duplicate_notes: notes || `Merged into master ticket ${master.complaint_code || master.id}`,
      history: [
        ...(duplicate.history || []),
        {
          stage: 'DUPLICATE_LINKED',
          timestamp: now,
          actor: req.user.name,
          note: `Linked as duplicate to master issue ${master.complaint_code || master.id}. ${notes || ''}`,
        },
      ],
    });

    inMemoryDb.logAudit({
      township_id: duplicate.township_id,
      entity_type: 'COMPLAINT',
      entity_id: duplicate.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'DUPLICATE_LINKED',
      from_state: duplicate.status,
      to_state: 'DUPLICATE_LINKED',
      notes: `Linked to master ${master.complaint_code || master.id}`,
    });

    res.status(200).json({
      success: true,
      message: `Complaint linked to master issue ${master.complaint_code || master.id}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Escalate complaint / work order due to SLA breach or contractor delay
 * @route  POST /api/v1/clerk/escalate/:id
 * @body   { reason: string, escalateTo?: 'CONTRACTOR' | 'DEPT_HEAD' | 'COO' }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const escalateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, escalateTo = 'DEPT_HEAD' } = req.body;

    const complaint = inMemoryDb.findOne('complaints', (c) => c.id === id || c.complaint_code === id);
    if (!complaint) {
      return next(new AppError(`Complaint '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    const nextStatus = escalateTo === 'COO' ? 'ESCALATED_TO_COO' : 'CONTRACTOR_ESCALATED';
    const now = new Date().toISOString();
    const note = `Escalated by Desk Clerk ${req.user.name} to ${escalateTo}. Reason: "${reason || 'SLA breach detected'}"`;

    const updated = inMemoryDb.update('complaints', complaint.id, {
      status: nextStatus,
      escalation_reason: reason || 'SLA breached / execution delay',
      escalated_at: now,
      history: [
        ...(complaint.history || []),
        { stage: nextStatus, timestamp: now, actor: req.user.name, note },
      ],
    });

    inMemoryDb.logAudit({
      township_id: complaint.township_id,
      entity_type: 'COMPLAINT',
      entity_id: complaint.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'ESCALATION',
      from_state: complaint.status,
      to_state: nextStatus,
      notes: note,
    });

    res.status(200).json({
      success: true,
      message: `Ticket successfully escalated. Status is now ${nextStatus}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  triageComplaint,
  validateComplaint,
  rejectComplaint,
  createWorkOrder,
  getWorkOrders,
  getWorkOrderById,
  getTriageQueue,
  checkDuplicates,
  linkDuplicate,
  escalateComplaint,
};
