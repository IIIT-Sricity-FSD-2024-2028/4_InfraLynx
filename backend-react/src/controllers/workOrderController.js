/**
 * workOrderController.js — TIMS Work Order Controller (Member 2 - Desk Clerk)
 *
 * Responsibilities:
 *   1. Create Work Order       — From VALIDATED complaint with duplicate prevention
 *   2. Assign Contractor       — Assign accredited AMC contractor; makes WO appear in Contractor Inspection List
 *   3. Reassign Contractor     — Reassign WO with documented reason
 *   4. Track Work Orders       — List WOs with SLA monitoring and unassigned/delayed filters
 *   5. Work Order Detail       — Fetch single WO with complaint & contractor context
 */

import crypto from 'crypto';
import db from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { generateWorkOrderNumber } from '../utils/generateId.js';
import { calculateSlaDeadline, evaluateSlaStatus } from '../services/slaService.js';

/** ₹10,000 threshold above which Department Head approval is required */
const DEPT_HEAD_THRESHOLD = 10000;

/**
 * Format work order response with populated contractor and linked complaint info
 */
export function formatWorkOrderResponse(wo) {
  if (!wo) return null;

  // Contractor info
  const contractor = wo.contractor_id
    ? db.findOne('contractors', (c) => c.id === wo.contractor_id)
    : null;

  const amcs = db.find('amcs');
  const contractorAmc = contractor
    ? amcs.find((a) => a.contractor_id === contractor.id && (a.status === 'ACTIVE' || !a.status))
    : null;

  // Linked complaint info
  const complaint = wo.complaint_id
    ? db.findOne('complaints', (c) => c.id === wo.complaint_id)
    : null;

  // SLA health
  const dueAt = wo.due_at || (complaint ? complaint.sla_deadline : null);
  const slaStatus = evaluateSlaStatus(dueAt, wo.status);

  return {
    id:                   wo.id,
    workOrderNumber:      wo.work_order_number || wo.work_order_code || wo.id,
    workOrderCode:        wo.work_order_code || wo.work_order_number || wo.id,
    complaintId:          wo.complaint_id,
    townshipId:           wo.township_id,
    departmentId:         wo.department_id,
    status:               wo.status,
    priority:             wo.priority,
    estimateAmount:       wo.estimate_amount || 0,
    requiresDeptHead:     Boolean(wo.requires_dept_head),
    specialInstructions:  wo.special_instructions || '',
    assignmentNotes:      wo.assignment_notes || '',
    assignedAt:           wo.assigned_at || null,
    assignedBy:           wo.assigned_by || null,
    dueAt:                wo.due_at || dueAt,
    completedAt:          wo.completed_at || null,
    lineItems:            wo.line_items || [],
    isUnassigned:         !wo.contractor_id,
    isDelayed:            slaStatus.isBreached || slaStatus.state === 'AT_RISK',
    slaStatus,
    contractor: contractor
      ? {
          id:            contractor.id,
          name:          contractor.company_name,
          companyName:   contractor.company_name,
          contactPerson: contractor.contact_person,
          phone:         contractor.phone,
          email:         contractor.email,
          amcContractId: contractorAmc ? contractorAmc.contract_number : null,
          rating:        contractor.rating || 4.7,
        }
      : null,
    complaint: complaint
      ? {
          id:             complaint.id,
          complaintCode:  complaint.complaint_code || complaint.id,
          title:          complaint.title,
          category:       complaint.category,
          subcategory:    complaint.subcategory,
          severity:       complaint.severity,
          status:         complaint.status,
          sector:         complaint.sector || complaint.location?.sector,
          block:          complaint.block || complaint.location?.block,
          street:         complaint.street || complaint.location?.street,
          locationDetails: complaint.location_details || complaint.location?.landmark,
        }
      : null,
    createdAt: wo.created_at,
    updatedAt: wo.updated_at || null,
  };
}

/**
 * @desc   Create Work Order from a VALIDATED complaint
 * @route  POST /api/v1/work-orders
 * @route  POST /api/v1/clerk/work-orders
 * @body   { complaintId, contractorId?, priority?, lineItems?, specialInstructions? }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const createWorkOrder = async (req, res, next) => {
  try {
    const {
      complaintId,
      complaint_id,
      contractorId,
      contractor_id,
      priority,
      lineItems = [],
      line_items,
      specialInstructions,
      special_instructions,
    } = req.body;

    const targetComplaintId = complaintId || complaint_id;
    if (!targetComplaintId) {
      return next(new AppError('complaintId is required to create a Work Order.', 400, 'VALIDATION_ERROR'));
    }

    // 1. Verify complaint exists
    const complaint = db.findOne(
      'complaints',
      (c) => c.id === targetComplaintId || c.complaint_code === targetComplaintId
    );
    if (!complaint) {
      return next(new AppError(`Complaint "${targetComplaintId}" not found.`, 404, 'NOT_FOUND'));
    }

    // 2. Validate complaint status: MUST be in VALIDATED status
    if (complaint.status !== 'VALIDATED') {
      return next(
        new AppError(
          `Cannot create Work Order. Complaint must be in VALIDATED status (current status: ${complaint.status}).`,
          400,
          'INVALID_STATUS_TRANSITION'
        )
      );
    }

    // 3. Prevent multiple Work Orders from being created accidentally for the same complaint
    const existingWo = db.findOne(
      'work_orders',
      (w) => w.complaint_id === complaint.id && w.status !== 'CANCELLED'
    );
    if (existingWo) {
      return next(
        new AppError(
          `Work Order (${existingWo.work_order_number || existingWo.work_order_code || existingWo.id}) has already been created for this complaint. Duplicate work order creation is prevented.`,
          400,
          'WORK_ORDER_ALREADY_EXISTS'
        )
      );
    }

    // 4. Compute line items & estimate total
    const resolvedLines = Array.isArray(lineItems) && lineItems.length > 0 ? lineItems : (line_items || []);
    let estimateTotal = 0;
    const rateCards = db.find('amc_rates');

    const formattedLines = resolvedLines.map((item) => {
      const card = rateCards.find(
        (r) => r.id === item.rateCardId || r.id === item.rate_card_id || r.item_code === item.itemCode
      );
      const rate = card ? Number(card.rate) : Number(item.rate || item.unitCost || 0);
      const qty  = Number(item.qty || item.quantity || 1);
      const amount = rate * qty;
      estimateTotal += amount;

      return {
        rateCardId:  card ? card.id : (item.rateCardId || null),
        itemCode:    card ? card.item_code : (item.itemCode || 'GEN-SRV'),
        description: card ? card.item_name : (item.description || 'General Service Item'),
        unit:        card ? card.unit : (item.unit || 'unit'),
        rate,
        qty,
        amount,
      };
    });

    if (req.body.estimateAmount) {
      estimateTotal = Number(req.body.estimateAmount);
    }

    const requiresDeptHead = estimateTotal > DEPT_HEAD_THRESHOLD;
    const chosenPriority = (priority || complaint.severity || 'MEDIUM').toUpperCase();
    const now = new Date().toISOString();
    const slaDeadline = calculateSlaDeadline(chosenPriority, now);

    // 5. Handle contractor assignment if provided
    const chosenContractorId = contractorId || contractor_id || null;
    let assignedContractor = null;

    if (chosenContractorId) {
      assignedContractor = db.findOne('contractors', (c) => c.id === chosenContractorId && c.status === 'ACTIVE');
      if (!assignedContractor) {
        return next(new AppError(`Selected contractor "${chosenContractorId}" not found or inactive.`, 404, 'NOT_FOUND'));
      }
    }

    // Determine initial status
    let woStatus = 'WORK_ORDER_CREATED';
    if (requiresDeptHead) {
      woStatus = 'AWAITING_DEPT_HEAD';
    } else if (assignedContractor) {
      woStatus = 'ASSIGNED';
    }

    // 6. Create unique Work Order record
    const woId = crypto.randomUUID();
    const woCode = generateWorkOrderNumber();

    const newWorkOrder = {
      id:                   woId,
      work_order_number:    woCode,
      work_order_code:      woCode,
      township_id:          complaint.township_id || req.user.township_id,
      complaint_id:         complaint.id,
      department_id:        complaint.department_id,
      contractor_id:        assignedContractor ? assignedContractor.id : null,
      assigned_by:          assignedContractor ? req.user.id : null,
      assigned_at:          assignedContractor ? now : null,
      status:               woStatus,
      priority:             chosenPriority,
      estimate_amount:      estimateTotal,
      requires_dept_head:   requiresDeptHead,
      due_at:               slaDeadline,
      special_instructions: specialInstructions || special_instructions || '',
      line_items:           formattedLines,
      created_by_id:        req.user.id,
      created_by_name:      req.user.name,
      created_at:           now,
      updated_at:           now,
    };

    db.insert('work_orders', newWorkOrder);

    // 7. Update linked complaint
    const complaintStatus = requiresDeptHead
      ? 'AWAITING_DEPT_HEAD'
      : (assignedContractor ? 'ASSIGNED' : 'WORK_ORDER_CREATED');

    const note = requiresDeptHead
      ? `Work Order ${woCode} created (Estimate ₹${estimateTotal.toLocaleString()} exceeds threshold). Awaiting Dept Head approval.`
      : assignedContractor
        ? `Work Order ${woCode} created and assigned to ${assignedContractor.company_name}.`
        : `Work Order ${woCode} created. Awaiting contractor assignment.`;

    db.update('complaints', complaint.id, {
      status: complaintStatus,
      work_order_id: woId,
      work_order_code: woCode,
      assigned_contractor_id: assignedContractor ? assignedContractor.id : null,
      history: [
        ...(complaint.history || []),
        {
          stage: complaintStatus,
          timestamp: now,
          actor: `${req.user.name} (Desk Clerk)`,
          note,
        },
      ],
    });

    // 8. Audit log
    db.insert('audit_logs', {
      township_id: complaint.township_id || req.user.township_id,
      user_id:     req.user.id,
      action:      'WORK_ORDER_CREATED',
      entity_type: 'work_orders',
      entity_id:   woId,
      old_value:   JSON.stringify({ complaintStatus: complaint.status }),
      new_value:   JSON.stringify({ workOrderCode: woCode, status: woStatus, estimateTotal, requiresDeptHead }),
    });

    res.status(201).json({
      success: true,
      message: requiresDeptHead
        ? `Work Order ${woCode} created successfully (Estimate ₹${estimateTotal.toLocaleString()} requires Dept Head approval).`
        : `Work Order ${woCode} created successfully.`,
      data: formatWorkOrderResponse(newWorkOrder),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Assign eligible contractor to Work Order (moves status to ASSIGNED & appears in contractor Inspection List)
 * @route  POST /api/v1/work-orders/:id/assign
 * @route  POST /api/v1/clerk/work-orders/:id/assign
 * @body   { contractorId, notes? }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const assignContractor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { contractorId, contractor_id, notes, instructions } = req.body;

    const chosenContractorId = contractorId || contractor_id;
    if (!chosenContractorId) {
      return next(new AppError('contractorId is required.', 400, 'VALIDATION_ERROR'));
    }

    // 1. Locate Work Order
    const wo = db.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_number === id || w.work_order_code === id
    );
    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    // 2. Validate contractor exists and is active
    const contractor = db.findOne('contractors', (c) => c.id === chosenContractorId);
    if (!contractor) {
      return next(new AppError(`Contractor "${chosenContractorId}" not found.`, 404, 'NOT_FOUND'));
    }
    if (contractor.status !== 'ACTIVE') {
      return next(new AppError(`Contractor "${contractor.company_name}" is currently inactive.`, 400, 'INACTIVE_CONTRACTOR'));
    }

    const now = new Date().toISOString();
    const assignmentNotes = notes || instructions || '';

    // 3. Update Work Order: status -> ASSIGNED
    const updatedWo = db.update('work_orders', wo.id, {
      contractor_id:    contractor.id,
      assigned_by:      req.user.id,
      assigned_at:      now,
      assignment_notes: assignmentNotes,
      status:           'ASSIGNED',
      updated_at:       now,
    });

    // 4. Update linked complaint: status -> ASSIGNED
    if (wo.complaint_id) {
      const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
      if (complaint) {
        db.update('complaints', complaint.id, {
          status: 'ASSIGNED',
          assigned_contractor_id: contractor.id,
          history: [
            ...(complaint.history || []),
            {
              stage: 'ASSIGNED',
              timestamp: now,
              actor: `${req.user.name} (Desk Clerk)`,
              note: `Work Order assigned to ${contractor.company_name}. Order ready for on-site contractor inspection.`,
            },
          ],
        });
      }
    }

    // 5. Audit log
    db.insert('audit_logs', {
      township_id: wo.township_id || req.user.township_id,
      user_id:     req.user.id,
      action:      'WORK_ORDER_ASSIGNED',
      entity_type: 'work_orders',
      entity_id:   wo.id,
      old_value:   JSON.stringify({ previousContractor: wo.contractor_id, status: wo.status }),
      new_value:   JSON.stringify({ contractorId: contractor.id, status: 'ASSIGNED', assignedAt: now }),
    });

    res.status(200).json({
      success: true,
      message: `Work Order ${updatedWo.work_order_number || updatedWo.work_order_code || updatedWo.id} assigned to ${contractor.company_name}. Job now active in contractor Inspection List.`,
      data: formatWorkOrderResponse(updatedWo),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Reassign Work Order to a different contractor with mandatory documented reason
 * @route  POST /api/v1/work-orders/:id/reassign
 * @route  POST /api/v1/clerk/work-orders/:id/reassign
 * @body   { newContractorId, reason, notes? }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const reassignContractor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newContractorId, new_contractor_id, reason, notes } = req.body;

    const targetContractorId = newContractorId || new_contractor_id;
    if (!targetContractorId || !reason) {
      return next(new AppError('newContractorId and reason are required for reassignment.', 400, 'VALIDATION_ERROR'));
    }

    const wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id || w.work_order_code === id);
    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const newContractor = db.findOne('contractors', (c) => c.id === targetContractorId && c.status === 'ACTIVE');
    if (!newContractor) {
      return next(new AppError(`New contractor "${targetContractorId}" not found or inactive.`, 404, 'NOT_FOUND'));
    }

    const oldContractor = wo.contractor_id ? db.findOne('contractors', (c) => c.id === wo.contractor_id) : null;
    const now = new Date().toISOString();

    const updatedWo = db.update('work_orders', wo.id, {
      contractor_id:         newContractor.id,
      assigned_by:           req.user.id,
      assigned_at:           now,
      reassignment_reason:   reason,
      reassignment_notes:    notes || '',
      previous_contractor_id: wo.contractor_id,
      status:                'ASSIGNED',
      updated_at:            now,
    });

    if (wo.complaint_id) {
      const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
      if (complaint) {
        db.update('complaints', complaint.id, {
          assigned_contractor_id: newContractor.id,
          history: [
            ...(complaint.history || []),
            {
              stage: 'REASSIGNED',
              timestamp: now,
              actor: `${req.user.name} (Desk Clerk)`,
              note: `Work Order reassigned from ${oldContractor?.company_name || 'previous contractor'} to ${newContractor.company_name}. Reason: "${reason}".`,
            },
          ],
        });
      }
    }

    db.insert('audit_logs', {
      township_id: wo.township_id || req.user.township_id,
      user_id:     req.user.id,
      action:      'WORK_ORDER_REASSIGNED',
      entity_type: 'work_orders',
      entity_id:   wo.id,
      old_value:   JSON.stringify({ contractorId: wo.contractor_id }),
      new_value:   JSON.stringify({ newContractorId: newContractor.id, reason }),
    });

    res.status(200).json({
      success: true,
      message: `Work Order successfully reassigned to ${newContractor.company_name}.`,
      data: formatWorkOrderResponse(updatedWo),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   List Work Orders with SLA tracking, unassigned filter & delayed filter
 * @route  GET /api/v1/work-orders
 * @route  GET /api/v1/clerk/work-orders
 * @query  ?status=...&priority=...&unassigned=true&delayed=true&contractorId=...
 * @access Private (DESK_CLERK, TOWNSHIP_COO, DEPARTMENT_HEAD, FIELD_CONTRACTOR)
 */
export const getWorkOrders = async (req, res, next) => {
  try {
    const { status, priority, contractorId, unassigned, delayed, search } = req.query;

    let workOrders = db.find('work_orders');

    // Township filtering
    if (req.user.township_id) {
      workOrders = workOrders.filter((w) => !w.township_id || w.township_id === req.user.township_id);
    }

    // Role-specific contractor filtering
    if (req.user.role === 'FIELD_CONTRACTOR' && req.user.contractor_id) {
      workOrders = workOrders.filter((w) => w.contractor_id === req.user.contractor_id);
    }

    // Status filter
    if (status) {
      workOrders = workOrders.filter((w) => (w.status || '').toUpperCase() === status.toUpperCase());
    }

    // Priority filter
    if (priority) {
      workOrders = workOrders.filter((w) => (w.priority || '').toUpperCase() === priority.toUpperCase());
    }

    // Contractor filter
    if (contractorId) {
      workOrders = workOrders.filter((w) => w.contractor_id === contractorId);
    }

    // Format and enrich all matching
    let formatted = workOrders.map(formatWorkOrderResponse);

    // Unassigned filter
    if (unassigned === 'true') {
      formatted = formatted.filter((w) => w.isUnassigned);
    }

    // Delayed / SLA Breached filter
    if (delayed === 'true') {
      formatted = formatted.filter((w) => w.isDelayed);
    }

    // Search query filter
    if (search) {
      const q = search.toLowerCase();
      formatted = formatted.filter((w) =>
        w.workOrderCode.toLowerCase().includes(q) ||
        (w.complaint?.title || '').toLowerCase().includes(q) ||
        (w.contractor?.name || '').toLowerCase().includes(q)
      );
    }

    // Sort newest first
    formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Summary counts
    const summary = {
      total:       formatted.length,
      unassigned:  formatted.filter((w) => w.isUnassigned).length,
      delayed:     formatted.filter((w) => w.isDelayed).length,
      assigned:    formatted.filter((w) => w.status === 'ASSIGNED').length,
      inProgress:  formatted.filter((w) => w.status === 'IN_PROGRESS').length,
      completed:   formatted.filter((w) => w.status === 'COMPLETED').length,
    };

    res.status(200).json({
      success: true,
      count: formatted.length,
      summary,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get single Work Order by ID or code
 * @route  GET /api/v1/work-orders/:id
 * @route  GET /api/v1/clerk/work-orders/:id
 * @access Private (DESK_CLERK, TOWNSHIP_COO, DEPARTMENT_HEAD, FIELD_CONTRACTOR)
 */
export const getWorkOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const wo = db.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_number === id || w.work_order_code === id
    );

    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: formatWorkOrderResponse(wo),
    });
  } catch (err) {
    next(err);
  }
};

export default {
  createWorkOrder,
  assignContractor,
  reassignContractor,
  getWorkOrders,
  getWorkOrderById,
  formatWorkOrderResponse,
};