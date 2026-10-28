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
import { calculateSlaDeadline, evaluateSlaStatus, pauseSla, resumeSla } from '../services/slaService.js';

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

  const wo_number = wo.work_order_number || wo.id;
  const estimated_cost = Number(wo.estimated_cost || 0);
  const actual_cost = wo.actual_cost !== null && wo.actual_cost !== undefined
    ? Number(wo.actual_cost)
    : (wo.status === 'COMPLETED' ? estimated_cost : null);

  return {
    id:                   wo.id,
    work_order_number:    wo_number,
    workOrderNumber:      wo_number,
    workOrderCode:        wo_number,
    complaint_id:         wo.complaint_id,
    complaintId:          wo.complaint_id,
    township_id:          wo.township_id,
    townshipId:           wo.township_id,
    department_id:        wo.department_id,
    departmentId:         wo.department_id,
    contractor_id:        wo.contractor_id || (contractor ? contractor.id : null),
    contractorId:         wo.contractor_id || (contractor ? contractor.id : null),
    status:               wo.status,
    priority:             wo.priority,
    estimated_cost:       estimated_cost,
    estimateAmount:       estimated_cost,
    estimatedCost:        estimated_cost,
    actual_cost:          actual_cost,
    actualCost:           actual_cost,
    moneyEstimated:       estimated_cost,
    moneyUsed:            actual_cost !== null ? actual_cost : 0,
    requires_dept_head:   Boolean(wo.requires_dept_head),
    requiresDeptHead:     Boolean(wo.requires_dept_head),
    special_instructions: wo.special_instructions || '',
    specialInstructions:  wo.special_instructions || '',
    assignment_notes:     wo.assignment_notes || '',
    assignmentNotes:      wo.assignment_notes || '',
    assigned_at:          wo.assigned_at || null,
    assignedAt:           wo.assigned_at || null,
    assigned_by:          wo.assigned_by || null,
    assignedBy:           wo.assigned_by || null,
    due_at:               wo.due_at || dueAt,
    dueAt:                wo.due_at || dueAt,
    completed_at:         wo.completed_at || null,
    completedAt:          wo.completed_at || null,
    line_items:           wo.line_items || [],
    lineItems:            wo.line_items || [],
    isUnassigned:         !wo.contractor_id,
    isDelayed:            slaStatus.isBreached || slaStatus.state === 'AT_RISK',
    bidding_open:         Boolean(wo.bidding_open),
    biddingOpen:          Boolean(wo.bidding_open),
    selected_bid_id:      wo.selected_bid_id || null,
    contractor_reason:    wo.contractor_reason || '',
    contractorReason:     wo.contractor_reason || '',
    inquiry_remark:       wo.inquiry_remark || '',
    inquiryRemark:        wo.inquiry_remark || '',
    inquiry_by:           wo.inquiry_by || null,
    inquiry_by_role:      wo.inquiry_by_role || null,
    overrun_inquiry_status: wo.overrun_inquiry_status || 'NONE',
    overrunInquiryStatus: wo.overrun_inquiry_status || 'NONE',
    bids:                 (db.findAll('work_order_bids', (b) => b.work_order_id === wo.id) || []),
    inquiries:            (db.findAll('cost_overrun_inquiries', (q) => q.work_order_id === wo.id) || []),
    slaStatus,
    contractor: contractor
      ? {
          id:            contractor.id,
          name:          contractor.company_name,
          company_name:  contractor.company_name,
          companyName:   contractor.company_name,
          contact_person: contractor.contact_person,
          contactPerson: contractor.contact_person,
          phone:         contractor.phone,
          email:         contractor.email,
          amc_contract_id: contractorAmc ? contractorAmc.contract_number : null,
          amcContractId: contractorAmc ? contractorAmc.contract_number : null,
          rating:        contractor.rating || 4.7,
        }
      : null,
    complaint: complaint
      ? {
          id:             complaint.id,
          complaint_code: complaint.complaint_code || complaint.id,
          complaintCode:  complaint.complaint_code || complaint.id,
          title:          complaint.title,
          category:       complaint.category,
          subcategory:    complaint.subcategory,
          severity:       complaint.severity,
          status:         complaint.status,
          sector:         complaint.sector || complaint.location?.sector,
          block:          complaint.block || complaint.location?.block,
          street:         complaint.street || complaint.location?.street,
          location_details: complaint.location_details || complaint.location?.landmark,
          locationDetails: complaint.location_details || complaint.location?.landmark,
          sla_deadline:   complaint.sla_deadline,
          slaDeadline:    complaint.sla_deadline,
        }
      : null,
    created_at: wo.created_at,
    createdAt: wo.created_at,
    updated_at: wo.updated_at || null,
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

    // 5. Handle contractor assignment (auto-resolve department contractor if not provided)
    let chosenContractorId = contractorId || contractor_id || null;
    let assignedContractor = null;
    const allAmcs = db.find('amcs');
    const allDepts = db.find('departments');

    if (chosenContractorId) {
      assignedContractor = db.findOne('contractors', (c) => c.id === chosenContractorId && c.status === 'ACTIVE');
      if (!assignedContractor) {
        return next(new AppError(`Selected contractor "${chosenContractorId}" not found or inactive.`, 404, 'NOT_FOUND'));
      }
    } else {
      // Auto-assign contractor with active AMC for this complaint's department / category
      const deptId = complaint.department_id;
      const cat = (complaint.category || '').toLowerCase();

      const matchingAmc = allAmcs.find((a) => {
        if (a.status && a.status !== 'ACTIVE') return false;
        if (deptId && a.department_id === deptId) return true;
        if (cat) {
          const dept = allDepts.find((d) => d.id === a.department_id);
          if (dept && (dept.name.toLowerCase().includes(cat) || cat.includes(dept.name.toLowerCase()))) return true;
        }
        return false;
      });

      if (matchingAmc) {
        assignedContractor = db.findOne('contractors', (c) => c.id === matchingAmc.contractor_id && c.status === 'ACTIVE');
      }
    }

    // Determine initial status
    let woStatus = 'WORK_ORDER_CREATED';
    if (requiresDeptHead) {
      woStatus = 'AWAITING_DEPT_HEAD';
    } else if (assignedContractor) {
      woStatus = 'ASSIGNED';
    }

    // Resolve department ID if missing on complaint
    let resolvedDeptId = complaint.department_id;
    if (!resolvedDeptId && assignedContractor) {
      const amc = allAmcs.find((a) => a.contractor_id === assignedContractor.id);
      if (amc?.department_id) resolvedDeptId = amc.department_id;
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
      department_id:        resolvedDeptId || complaint.department_id,
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

    // Desk clerk department filter: clerk only sees work orders under their department
    const clerk_department_id = req.user.department_id;
    if (req.user.role === 'DESK_CLERK' && clerk_department_id) {
      workOrders = workOrders.filter((w) => {
        if (w.created_by_id === req.user.id || w.assigned_by === req.user.id) return true;
        if (w.department_id && String(w.department_id) === String(clerk_department_id)) return true;
        const comp = db.findOne('complaints', (c) => c.id === w.complaint_id || c.complaint_code === w.complaint_id);
        if (comp && comp.department_id && String(comp.department_id) === String(clerk_department_id)) return true;
        return false;
      });
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

/**
 * @desc   Open a Work Order for multi-contractor bidding
 * @route  POST /api/v1/work-orders/:id/open-bidding
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const openBidding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id);

    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const now = new Date().toISOString();
    const updated = db.update('work_orders', wo.id, {
      bidding_open: true,
      status: 'ASSIGNED',
      updated_at: now,
    });

    db.logAudit({
      township_id: wo.township_id || req.user.township_id,
      user_id: req.user.id,
      action: 'WORK_ORDER_BIDDING_OPENED',
      entity_type: 'work_orders',
      entity_id: wo.id,
      old_value: JSON.stringify({ bidding_open: false }),
      new_value: JSON.stringify({ bidding_open: true }),
      notes: `Work Order ${wo.work_order_number || wo.id} opened for contractor bidding.`,
    });

    res.status(200).json({
      success: true,
      message: 'Work Order successfully opened for multi-contractor bidding.',
      data: formatWorkOrderResponse(updated),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Submit a contractor bid on a Work Order
 * @route  POST /api/v1/work-orders/:id/bids
 * @access Private (FIELD_CONTRACTOR, DESK_CLERK, TOWNSHIP_COO)
 */
export const submitBid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { contractor_id, bid_amount, estimated_days = 2, justification = '' } = req.body;

    const wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id);
    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const targetContractorId = req.user.contractor_id || contractor_id;
    if (!targetContractorId) {
      return next(new AppError('contractor_id is required to submit a bid.', 400, 'VALIDATION_ERROR'));
    }

    const contractor = db.findOne('contractors', (c) => c.id === targetContractorId);
    if (!contractor) {
      return next(new AppError('Contractor not found.', 404, 'NOT_FOUND'));
    }

    if (!bid_amount || Number(bid_amount) <= 0) {
      return next(new AppError('A valid positive bid_amount is required.', 400, 'VALIDATION_ERROR'));
    }

    const rating = Number(contractor.rating || 4.7);
    const now = new Date().toISOString();

    // Check if contractor already submitted a bid for this work order
    const existingBid = db.findOne(
      'work_order_bids',
      (b) => b.work_order_id === wo.id && b.contractor_id === targetContractorId
    );

    let savedBid;
    if (existingBid) {
      savedBid = db.update('work_order_bids', existingBid.id, {
        bid_amount: Number(bid_amount),
        estimated_days: Number(estimated_days),
        justification,
        contractor_rating_snapshot: rating,
        status: 'SUBMITTED',
        submitted_at: now,
      });
    } else {
      savedBid = db.insert('work_order_bids', {
        work_order_id: wo.id,
        contractor_id: targetContractorId,
        bid_amount: Number(bid_amount),
        estimated_days: Number(estimated_days),
        justification,
        contractor_rating_snapshot: rating,
        status: 'SUBMITTED',
        submitted_at: now,
      });
    }

    res.status(201).json({
      success: true,
      message: `Bid of ₹${Number(bid_amount).toLocaleString()} submitted by ${contractor.company_name}.`,
      data: {
        ...savedBid,
        contractor_name: contractor.company_name,
        rating,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get all bids for a Work Order with composite scoring
 * @route  GET /api/v1/work-orders/:id/bids
 * @access Private
 */
export const getWorkOrderBids = async (req, res, next) => {
  try {
    const { id } = req.params;
    const wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id);

    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const bids = db.findAll('work_order_bids', (b) => b.work_order_id === wo.id);
    const contractors = db.find('contractors');

    if (bids.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const minBid = Math.min(...bids.map((b) => Number(b.bid_amount)));

    const scoredBids = bids.map((b) => {
      const c = contractors.find((item) => item.id === b.contractor_id);
      const rating = Number(b.contractor_rating_snapshot || c?.rating || 4.5);
      const costScore = minBid > 0 ? Number((minBid / Number(b.bid_amount)).toFixed(4)) : 1.0;
      const ratingScore = Number((rating / 5.0).toFixed(4));
      // Composite algorithm: 60% weight to low cost, 40% weight to high rating
      const compositeScore = Number(((0.60 * costScore) + (0.40 * ratingScore)).toFixed(4));

      return {
        ...b,
        contractor_name: c ? c.company_name : 'Unknown Contractor',
        rating,
        cost_score: costScore,
        rating_score: ratingScore,
        composite_score: compositeScore,
      };
    }).sort((a, b) => b.composite_score - a.composite_score || a.bid_amount - b.bid_amount);

    res.status(200).json({
      success: true,
      count: scoredBids.length,
      data: scoredBids,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Auto-select best contractor bid based on low cost & high rating
 * @route  POST /api/v1/work-orders/:id/auto-select-bid
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const autoSelectBestBid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id);

    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const bids = db.findAll('work_order_bids', (b) => b.work_order_id === wo.id);
    if (!bids || bids.length === 0) {
      return next(new AppError('No bids have been submitted for this work order yet.', 400, 'NO_BIDS_AVAILABLE'));
    }

    const contractors = db.find('contractors');
    const minBid = Math.min(...bids.map((b) => Number(b.bid_amount)));

    // Calculate composite score for each bid
    const scoredBids = bids.map((b) => {
      const c = contractors.find((item) => item.id === b.contractor_id);
      const rating = Number(b.contractor_rating_snapshot || c?.rating || 4.5);
      const costScore = minBid > 0 ? Number((minBid / Number(b.bid_amount)).toFixed(4)) : 1.0;
      const ratingScore = Number((rating / 5.0).toFixed(4));
      const compositeScore = Number(((0.60 * costScore) + (0.40 * ratingScore)).toFixed(4));

      return {
        ...b,
        contractor: c,
        rating,
        cost_score: costScore,
        rating_score: ratingScore,
        composite_score: compositeScore,
      };
    }).sort((a, b) => b.composite_score - a.composite_score || a.bid_amount - b.bid_amount);

    const winningBid = scoredBids[0];
    const now = new Date().toISOString();

    // Mark winning bid as ACCEPTED and other bids as REJECTED
    scoredBids.forEach((b) => {
      const isWinner = b.id === winningBid.id;
      db.update('work_order_bids', b.id, {
        status: isWinner ? 'ACCEPTED' : 'REJECTED',
        selected_at: isWinner ? now : null,
        composite_score: b.composite_score,
      });
    });

    // Update Work Order with winning contractor and bid amount
    const updatedWo = db.update('work_orders', wo.id, {
      contractor_id: winningBid.contractor_id,
      selected_bid_id: winningBid.id,
      estimated_cost: Number(winningBid.bid_amount),
      estimate_amount: Number(winningBid.bid_amount),
      status: 'ASSIGNED',
      bidding_open: false,
      updated_at: now,
    });

    // Update linked complaint
    const complaint = db.findOne('complaints', (c) => c.id === wo.complaint_id);
    if (complaint) {
      db.update('complaints', complaint.id, {
        status: 'ASSIGNED',
        assigned_contractor_id: winningBid.contractor_id,
        history: [
          ...(complaint.history || []),
          {
            stage: 'ASSIGNED',
            timestamp: now,
            actor: `${req.user.name} (Auto-Selection Engine)`,
            note: `Contractor ${winningBid.contractor?.company_name || 'Winning Bidder'} auto-selected via competitive bidding (Bid: ₹${winningBid.bid_amount}, Rating: ${winningBid.rating}★, Score: ${winningBid.composite_score}).`,
          },
        ],
      });
    }

    db.logAudit({
      township_id: wo.township_id || req.user.township_id,
      user_id: req.user.id,
      action: 'BID_AUTO_SELECTED',
      entity_type: 'work_orders',
      entity_id: wo.id,
      new_value: JSON.stringify({
        winningContractor: winningBid.contractor?.company_name,
        bidAmount: winningBid.bid_amount,
        rating: winningBid.rating,
        compositeScore: winningBid.composite_score,
      }),
      notes: `Winning contractor auto-selected based on low cost & high rating.`,
    });

    res.status(200).json({
      success: true,
      message: `Best contractor auto-selected: ${winningBid.contractor?.company_name} (Bid: ₹${winningBid.bid_amount}, Score: ${winningBid.composite_score}).`,
      data: {
        winningBid,
        rankings: scoredBids,
        workOrder: formatWorkOrderResponse(updatedWo),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Add an inquiry remark by Finance or COO when amount used > amount asked
 * @route  POST /api/v1/work-orders/:id/overrun-inquiry
 * @access Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const addOverrunInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;

    if (!remark || !remark.trim()) {
      return next(new AppError('A descriptive inquiry remark is required asking why the amount is high.', 400, 'VALIDATION_ERROR'));
    }

    const wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id);
    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const now = new Date().toISOString();
    const est = Number(wo.estimated_cost || wo.estimate_amount || 0);
    const actual = Number(wo.actual_cost || wo.moneyUsed || est);
    const variance = actual - est;

    const inquiryRecord = db.insert('cost_overrun_inquiries', {
      work_order_id: wo.id,
      contractor_id: wo.contractor_id,
      original_estimate: est,
      actual_amount_used: actual,
      variance_amount: variance,
      contractor_reason: wo.contractor_reason || 'Insufficient reason given by contractor',
      inquirer_id: req.user.id,
      inquirer_role: req.user.role,
      inquirer_remark: remark.trim(),
      status: 'PENDING_CONTRACTOR_RESPONSE',
      created_at: now,
    });

    const updatedWo = db.update('work_orders', wo.id, {
      overrun_inquiry_status: 'INQUIRY_SENT',
      inquiry_remark: remark.trim(),
      inquiry_by: req.user.name,
      inquiry_by_role: req.user.role,
      updated_at: now,
    });

    // Also update linked invoice if present
    const invoice = db.findOne('invoices', (i) => i.work_order_id === wo.id);
    if (invoice) {
      db.update('invoices', invoice.id, {
        status: 'ON_HOLD_VARIANCE',
        inquiry_remark: remark.trim(),
        inquiry_by: req.user.name,
        inquiry_status: 'INSUFFICIENT_REASON_FLAGGED',
      });
    }

    db.logAudit({
      township_id: wo.township_id || req.user.township_id,
      user_id: req.user.id,
      action: 'OVERRUN_INQUIRY_ISSUED',
      entity_type: 'work_orders',
      entity_id: wo.id,
      new_value: JSON.stringify({
        remark,
        asked: est,
        used: actual,
        variance,
        inquiredBy: `${req.user.name} (${req.user.role})`,
      }),
      notes: `Inquiry dispatched to contractor questioning high expenditure.`,
    });

    res.status(200).json({
      success: true,
      message: `Inquiry successfully sent to contractor: "${remark.trim()}"`,
      data: {
        inquiry: inquiryRecord,
        workOrder: formatWorkOrderResponse(updatedWo),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Contractor responds to an overrun inquiry with detailed justification
 * @route  POST /api/v1/work-orders/:id/overrun-response
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
export const respondToOverrunInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rebuttal } = req.body;

    if (!rebuttal || !rebuttal.trim()) {
      return next(new AppError('Detailed explanation/rebuttal is required.', 400, 'VALIDATION_ERROR'));
    }

    const wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id);
    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const now = new Date().toISOString();

    // Update active inquiry
    const activeInquiry = db.findOne(
      'cost_overrun_inquiries',
      (q) => q.work_order_id === wo.id && q.status === 'PENDING_CONTRACTOR_RESPONSE'
    );
    if (activeInquiry) {
      db.update('cost_overrun_inquiries', activeInquiry.id, {
        contractor_rebuttal: rebuttal.trim(),
        status: 'RESOLVED',
        resolved_at: now,
      });
    }

    const updatedWo = db.update('work_orders', wo.id, {
      overrun_inquiry_status: 'RESPONSE_SUBMITTED',
      contractor_reason: rebuttal.trim(),
      updated_at: now,
    });

    res.status(200).json({
      success: true,
      message: 'Contractor explanation submitted successfully for Finance/COO review.',
      data: formatWorkOrderResponse(updatedWo),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Finance or COO resolves/settles an overrun inquiry
 * @route  POST /api/v1/work-orders/:id/overrun-resolve
 * @access Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const resolveOverrunInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action = 'ACCEPT', final_amount } = req.body;

    const wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id);
    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const now = new Date().toISOString();
    const settledAmount = final_amount ? Number(final_amount) : Number(wo.actual_cost || wo.estimated_cost);

    const updatedWo = db.update('work_orders', wo.id, {
      overrun_inquiry_status: 'RESOLVED',
      actual_cost: settledAmount,
      updated_at: now,
    });

    const invoice = db.findOne('invoices', (i) => i.work_order_id === wo.id);
    if (invoice) {
      db.update('invoices', invoice.id, {
        status: action === 'ACCEPT' ? 'APPROVED_FOR_PAYMENT' : 'PENDING_AUDIT',
        total_amount: settledAmount,
        inquiry_status: 'RESOLVED',
      });
    }

    res.status(200).json({
      success: true,
      message: `Overrun inquiry resolved (${action}). Settled at ₹${settledAmount.toLocaleString()}.`,
      data: formatWorkOrderResponse(updatedWo),
    });
  } catch (err) {
    next(err);
  }
};


/**
 * @desc   Contractor retacts their bid prior to deadline
 * @route  POST /api/v1/work-orders/:id/bids/retract
 * @route  DELETE /api/v1/work-orders/:id/bids
 * @access Private (FIELD_CONTRACTOR, TOWNSHIP_COO)
 */
export const retractBid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id);
    if (!wo) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const targetContractorId = req.user.contractor_id || req.body.contractor_id;
    if (!targetContractorId) {
      return next(new AppError('contractor_id is required to retract a bid.', 400, 'VALIDATION_ERROR'));
    }

    const bid = db.findOne('work_order_bids', (b) => b.work_order_id === wo.id && b.contractor_id === targetContractorId);
    if (!bid) {
      return next(new AppError('No bid found for this contractor on this work order.', 404, 'NOT_FOUND'));
    }

    if (bid.status === 'ACCEPTED') {
      return next(new AppError('Cannot retract an awarded/accepted bid.', 400, 'BID_ALREADY_AWARDED'));
    }

    const now = new Date().toISOString();
    db.update('work_order_bids', bid.id, {
      status: 'RETRACTED',
      updated_at: now,
    });

    db.logAudit({
      township_id: wo.township_id,
      user_id: req.user.id,
      action: 'CONTRACTOR_BID_RETRACTED',
      entity_type: 'work_orders',
      entity_id: wo.id,
      notes: `Bid of ₹${bid.bid_amount} retracted by contractor ${targetContractorId}`,
    });

    res.status(200).json({
      success: true,
      message: 'Bid successfully retracted.',
      data: { bidId: bid.id, status: 'RETRACTED' },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Pause Work Order SLA clock
 * @route  POST /api/v1/work-orders/:id/pause
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const pauseWorkOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Work paused due to material delay / environmental conditions' } = req.body;
    const paused = pauseSla('work_orders', id, reason, req.user);
    if (!paused) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }
    res.status(200).json({
      success: true,
      message: 'Work order and SLA clock paused.',
      data: formatWorkOrderResponse(paused),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Resume Work Order SLA clock (extends deadline)
 * @route  POST /api/v1/work-orders/:id/resume
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const resumeWorkOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resumed = resumeSla('work_orders', id, req.user);
    if (!resumed) {
      return next(new AppError(`Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }
    res.status(200).json({
      success: true,
      message: 'Work order resumed and SLA deadline extended.',
      data: formatWorkOrderResponse(resumed),
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
  openBidding,
  submitBid,
  getWorkOrderBids,
  autoSelectBestBid,
  addOverrunInquiry,
  respondToOverrunInquiry,
  resolveOverrunInquiry,
  retractBid,
  pauseWorkOrder,
  resumeWorkOrder,
  formatWorkOrderResponse,
};