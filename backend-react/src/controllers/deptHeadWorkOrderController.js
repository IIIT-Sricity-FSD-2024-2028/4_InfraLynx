import db from '../config/db.js';
import { AppError } from '../middleware/error.js';

export const getWorkOrders = async (req, res, next) => {
  try {
    const townshipId = req.user.townshipId;
    let workOrders = db.findAll('work_orders', (w) => {
      return !townshipId || w.township_id === townshipId;
    });

    const { status, contractor_id, search, priority } = req.query;
    if (status) {
      workOrders = workOrders.filter(w => w.status === status);
    }
    if (contractor_id) {
      workOrders = workOrders.filter(w => w.contractor_id === contractor_id);
    }
    if (priority) {
      workOrders = workOrders.filter(w => w.priority === priority);
    }
    if (search) {
      const q = search.toLowerCase();
      workOrders = workOrders.filter(w => 
        w.work_order_code?.toLowerCase().includes(q) || 
        w.description?.toLowerCase().includes(q)
      );
    }
    
    workOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.status(200).json({
      success: true,
      count: workOrders.length,
      data: workOrders
    });
  } catch(err) {
    next(err);
  }
};

export const getWorkOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const townshipId = req.user.townshipId;

    let wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_code === id);
    if (!wo) {
      return next(new AppError(`Work order '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    if (townshipId && wo.township_id !== townshipId) {
      return next(new AppError('Forbidden access to another township data', 403, 'FORBIDDEN'));
    }
    
    const complaint = db.findOne('complaints', c => c.id === wo.complaint_id);
    const contractor = wo.contractor_id ? db.findById('contractors', wo.contractor_id) : null;
    
    res.status(200).json({
      success: true,
      data: {
        workOrder: wo,
        complaint,
        contractor
      }
    });
  } catch(err) {
    next(err);
  }
};

export const escalateWorkOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const townshipId = req.user.townshipId;

    if (!reason) {
      return next(new AppError('Escalation reason is required.', 400, 'VALIDATION_ERROR'));
    }

    let wo = db.findOne('work_orders', (w) => w.id === id || w.work_order_code === id);
    if (!wo) {
      return next(new AppError(`Work order '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    if (townshipId && wo.township_id !== townshipId) {
      return next(new AppError('Forbidden access to another township data', 403, 'FORBIDDEN'));
    }

    const now = new Date().toISOString();
    const updatedWo = db.update('work_orders', wo.id, {
      escalated: true,
      escalated_at: now,
      escalation_reason: reason,
      escalated_by: req.user.name || 'Department Head'
    });

    db.logAudit({
      township_id: updatedWo.township_id,
      entity_type: 'WORK_ORDER',
      entity_id: updatedWo.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'ESCALATED',
      from_state: updatedWo.status,
      to_state: updatedWo.status,
      notes: `Escalated by Department Head: ${reason}`
    });

    res.status(200).json({
      success: true,
      message: 'Work order successfully escalated.',
      data: updatedWo
    });
  } catch(err) {
    next(err);
  }
};
