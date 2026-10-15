import db from '../config/db.js';
import { AppError } from '../middleware/error.js';

const CIVIL_DEPT_ID = 'd0000000-0000-0000-0000-000000000001';

/**
 * @desc   List and filter work orders strictly for the authenticated Department Head's department (Civil only)
 * @route  GET /api/v1/dept-head/work-orders
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const getWorkOrders = async (req, res, next) => {
  try {
    const township_id = req.user.township_id;
    const department_id = req.user.department_id || CIVIL_DEPT_ID;

    // Filter work orders strictly belonging to user's department (unless COO)
    let workOrders = db.findAll('work_orders', (w) => {
      const matchTownship = !township_id || w.township_id === township_id;
      const matchDept = req.user.role === 'TOWNSHIP_COO' || w.department_id === department_id;
      return matchTownship && matchDept;
    });

    const { status, contractor_id, search, priority } = req.query;
    if (status) {
      workOrders = workOrders.filter((w) => w.status === status);
    }
    if (contractor_id) {
      workOrders = workOrders.filter((w) => w.contractor_id === contractor_id);
    }
    if (priority) {
      workOrders = workOrders.filter((w) => (w.priority || '').toUpperCase() === priority.toUpperCase());
    }
    if (search) {
      const q = search.toLowerCase();
      workOrders = workOrders.filter(
        (w) =>
          w.work_order_code?.toLowerCase().includes(q) ||
          w.work_order_number?.toLowerCase().includes(q) ||
          w.description?.toLowerCase().includes(q) ||
          w.special_instructions?.toLowerCase().includes(q)
      );
    }

    const now = new Date();

    // Enrich with complaint, location, contractor, priority, and SLA status
    const enriched = workOrders.map((w) => {
      const complaint = w.complaint_id ? db.findOne('complaints', (c) => c.id === w.complaint_id) : null;
      const contractor = w.contractor_id ? db.findById('contractors', w.contractor_id) : null;
      const department = w.department_id ? db.findById('departments', w.department_id) : null;

      const slaDeadline = w.sla_deadline || complaint?.sla_deadline || w.due_at;
      let slaStatus = 'ON_TRACK';
      if (['COMPLETED', 'CLOSED'].includes(w.status)) {
        slaStatus = 'RESOLVED';
      } else if (slaDeadline) {
        const deadlineDate = new Date(slaDeadline);
        const hoursLeft = (deadlineDate - now) / (1000 * 60 * 60);
        if (hoursLeft < 0) {
          slaStatus = 'OVERDUE';
        } else if (hoursLeft <= 6) {
          slaStatus = 'AT_RISK';
        }
      }

      const wo_number = w.work_order_number || w.id;
      const estimated_cost = Number(w.estimated_cost || 0);

      return {
        id: w.id,
        work_order_number: wo_number,
        workOrderId: wo_number,
        workOrderCode: wo_number,
        workOrderNumber: wo_number,
        complaint_id: w.complaint_id,
        complaintId: w.complaint_id,
        complaint_description: complaint?.description || w.special_instructions || 'Civil infrastructure repair',
        complaintDescription: complaint?.description || w.special_instructions || 'Civil infrastructure repair',
        category: complaint?.category || 'Civil',
        subcategory: complaint?.subcategory || 'Roads & Drainage',
        location: complaint?.location_details || complaint?.sector || 'Sector 54',
        location_details: complaint?.location_details || complaint?.sector || 'Sector 54',
        sector: complaint?.sector || 'Sector 54',
        assigned_contractor: contractor?.company_name || 'Unassigned',
        assignedContractor: contractor?.company_name || 'Unassigned',
        contractor_id: w.contractor_id,
        contractorId: w.contractor_id,
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
        currentStatus: w.status,
        status: w.status,
        priority: w.priority || complaint?.severity || 'Medium',
        sla_status: slaStatus,
        slaStatus,
        sla_deadline: slaDeadline,
        slaDeadline,
        estimated_cost,
        estimatedAmount: estimated_cost,
        estimateAmount: estimated_cost,
        actual_cost: w.actual_cost != null ? Number(w.actual_cost) : null,
        actualCost: w.actual_cost != null ? Number(w.actual_cost) : null,
        creationDate: w.created_at,
        createdAt: w.created_at,
        created_at: w.created_at,
        department_id: w.department_id,
        departmentId: w.department_id,
        department_name: department?.name || 'Civil Infrastructure & Roads',
        departmentName: department?.name || 'Civil Infrastructure & Roads',
        special_instructions: w.special_instructions || '',
        specialInstructions: w.special_instructions || '',
        line_items: w.line_items || [],
        lineItems: w.line_items || [],
        escalated: w.escalated || false,
        escalation_reason: w.escalation_reason || null,
        escalationReason: w.escalation_reason || null,
      };
    });

    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
 * @desc   Get work order details with strict department-level authorization
 * @route  GET /api/v1/dept-head/work-orders/:id
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const getWorkOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const township_id = req.user.township_id;
    const department_id = req.user.department_id || CIVIL_DEPT_ID;

    let wo = db.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_code === id || w.work_order_number === id
    );

    if (!wo) {
      return next(new AppError(`Work order '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    if (township_id && wo.township_id && wo.township_id !== township_id) {
      return next(new AppError('Forbidden: Access to another township data is prohibited.', 403, 'FORBIDDEN'));
    }

    // Backend security check: Enforce department authorization
    if (req.user.role === 'DEPARTMENT_HEAD' && wo.department_id && wo.department_id !== department_id) {
      return next(
        new AppError('Forbidden: Access to other department work orders is strictly prohibited.', 403, 'FORBIDDEN')
      );
    }

    const complaint = wo.complaint_id ? db.findOne('complaints', (c) => c.id === wo.complaint_id) : null;
    const contractor = wo.contractor_id ? db.findById('contractors', wo.contractor_id) : null;
    const department = wo.department_id ? db.findById('departments', wo.department_id) : null;

    res.status(200).json({
      success: true,
      data: {
        workOrder: {
          ...wo,
          departmentName: department?.name || 'Civil Infrastructure & Roads',
        },
        complaint,
        contractor,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Escalate a delayed or blocked Civil work order to Township COO
 * @route  POST /api/v1/dept-head/work-orders/:id/escalate
 * @body   { reason: string }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const escalateWorkOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const township_id = req.user.township_id;
    const department_id = req.user.department_id || CIVIL_DEPT_ID;

    if (!reason || !reason.trim()) {
      return next(new AppError('Escalation reason is required.', 400, 'VALIDATION_ERROR'));
    }

    let wo = db.findOne(
      'work_orders',
      (w) => w.id === id || w.work_order_code === id || w.work_order_number === id
    );

    if (!wo) {
      return next(new AppError(`Work order '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    if (township_id && wo.township_id && wo.township_id !== township_id) {
      return next(new AppError('Forbidden: Access to another township data is prohibited.', 403, 'FORBIDDEN'));
    }

    // Backend security check: Enforce department authorization
    if (req.user.role === 'DEPARTMENT_HEAD' && wo.department_id && wo.department_id !== department_id) {
      return next(
        new AppError('Forbidden: Cannot escalate a work order belonging to another department.', 403, 'FORBIDDEN')
      );
    }

    const now = new Date().toISOString();
    const updatedWo = db.update('work_orders', wo.id, {
      escalated: true,
      escalated_at: now,
      escalation_reason: reason.trim(),
      escalated_by: req.user.name || 'Civil Department Head',
      status: 'ESCALATED_TO_COO',
    });

    db.logAudit({
      township_id: updatedWo.township_id,
      entity_type: 'WORK_ORDER',
      entity_id: updatedWo.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'ESCALATED_TO_COO',
      from_state: wo.status,
      to_state: updatedWo.status,
      notes: `Escalated by Civil Department Head: ${reason}`,
    });

    res.status(200).json({
      success: true,
      message: 'Work order successfully escalated to Township COO.',
      data: updatedWo,
    });
  } catch (err) {
    next(err);
  }
};

