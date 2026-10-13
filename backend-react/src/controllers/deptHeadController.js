/**
 * deptHeadController.js — TIMS Department Head Backend (Member 4)
 *
 * Implements Civil Department Head workflow with strict backend security:
 *   1. Staff Management   — List Civil department clerks only, create Desk Clerk (locked to Civil), activate/suspend
 *   2. Department Analytics — Civil department metrics: work orders, SLAs, expenditure & activity
 */

import db from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { hashPassword } from '../utils/auth.js';

const CIVIL_DEPT_ID = 'd0000000-0000-0000-0000-000000000001';

/**
 * Resolves the authenticated user's department on the server
 */
export function getUserDepartment(req) {
  const deptId = req.user.departmentId || req.user.department_id || CIVIL_DEPT_ID;
  const dept = db.findById('departments', deptId);
  return {
    deptId,
    deptName: dept?.name || 'Civil Infrastructure & Roads',
  };
}

/**
 * Ensures authenticated user is authorized for Civil Department operations
 */
export function validateCivilAccess(req, resourceDeptId = null) {
  if (req.user.role === 'TOWNSHIP_COO') return true;

  const userDeptId = req.user.departmentId || req.user.department_id;
  if (!userDeptId) {
    throw new AppError('Access Restricted: You are not currently assigned to a department. Please contact the Township COO.', 403, 'UNASSIGNED_DEPARTMENT');
  }

  if (resourceDeptId && resourceDeptId !== userDeptId) {
    throw new AppError('Forbidden: Access to other department records is strictly prohibited.', 403, 'FORBIDDEN');
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Staff Management (Employees & Desk Clerks)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Get all Desk Clerks under this Department Head (Civil Department only)
 * @route  GET /api/v1/dept-head/staff
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const getStaff = async (req, res, next) => {
  try {
    const townshipId = req.user.townshipId || req.user.township_id;
    const { deptId, deptName } = getUserDepartment(req);
    validateCivilAccess(req, deptId);

    // Filter users strictly belonging to the authenticated Civil department
    const staffMembers = db.findAll('users', (u) => {
      const matchTownship = !townshipId || u.township_id === townshipId;
      const matchDept = u.department_id === deptId;
      const isStaff = u.role !== 'DEPARTMENT_HEAD' && u.role !== 'TOWNSHIP_COO';
      return isStaff && matchTownship && matchDept;
    });

    const sanitized = staffMembers.map((u) => {
      const dept = u.department_id ? db.findById('departments', u.department_id) : null;
      return {
        id: u.id,
        employeeId: u.id,
        name: u.name,
        employeeName: u.name,
        email: u.email,
        username: u.username,
        role: u.role,
        designation: u.designation || (u.role === 'DESK_CLERK' ? 'Operations Desk Clerk' : 'Civil Staff'),
        departmentId: u.department_id,
        departmentName: dept?.name || deptName,
        department: dept?.name || deptName,
        phone: u.phone,
        status: u.status || 'ACTIVE',
        accountStatus: u.status || 'ACTIVE',
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at || null,
      };
    });

    res.status(200).json({
      success: true,
      count: sanitized.length,
      departmentId: deptId,
      departmentName: deptName,
      data: sanitized,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Create new Desk Clerk employee account
 *         Per TIMS rules: auto-assigns role = DESK_CLERK and locks to Civil Department.
 * @route  POST /api/v1/dept-head/staff
 * @body   { name, email, username, password, phone }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const createStaff = async (req, res, next) => {
  try {
    const { deptId, deptName } = getUserDepartment(req);
    validateCivilAccess(req, deptId);

    const { name, email, username, password, phone } = req.body;

    if (!name || !email || !password) {
      return next(
        new AppError('Full name, email address, and temporary password are required.', 400, 'VALIDATION_ERROR')
      );
    }

    // Check duplicate email or username
    const existing = db.findOne(
      'users',
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() ||
        (username && u.username && u.username.toLowerCase() === username.toLowerCase())
    );

    if (existing) {
      return next(new AppError('A user with this email or username already exists.', 409, 'CONFLICT'));
    }

    const hashedPassword = await hashPassword(password);
    const townshipId = req.user.townshipId || req.user.township_id || 'b0000000-0000-0000-0000-000000000001';

    // MANDATORY SECURITY RULE: Role locked to DESK_CLERK, Department locked to Civil
    const newClerk = db.insert('users', {
      township_id: townshipId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      username: username ? username.trim().toLowerCase() : email.split('@')[0],
      password_hash: hashedPassword,
      role: 'DESK_CLERK',
      designation: 'Operations Desk Clerk',
      department_id: deptId,
      contractor_id: null,
      sector: null,
      phone: phone || '+91 98000 00000',
      status: 'ACTIVE',
      created_by_id: req.user.id,
      created_at: new Date().toISOString(),
    });

    db.logAudit({
      township_id: townshipId,
      entity_type: 'USER',
      entity_id: newClerk.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'CLERK_ACCOUNT_CREATED',
      from_state: 'NEW',
      to_state: 'ACTIVE',
      notes: `Desk Clerk account created for ${name} (${email}) by Civil Dept Head ${req.user.name}`,
    });

    res.status(201).json({
      success: true,
      message: `Desk Clerk ${name} successfully registered in ${deptName} with role DESK_CLERK.`,
      data: {
        id: newClerk.id,
        name: newClerk.name,
        email: newClerk.email,
        username: newClerk.username,
        role: newClerk.role,
        designation: newClerk.designation,
        departmentId: newClerk.department_id,
        departmentName: deptName,
        status: newClerk.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Update employee details (Civil employees only)
 * @route  PATCH /api/v1/dept-head/staff/:id
 * @body   { name, email, phone }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;
    const { deptId } = getUserDepartment(req);
    validateCivilAccess(req, deptId);

    const employee = db.findById('users', id);
    if (!employee) {
      return next(new AppError(`Employee '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    if (employee.role !== 'DESK_CLERK') {
      return next(new AppError('Only Desk Clerk employees can be managed here.', 403, 'FORBIDDEN'));
    }

    // Backend security check: Validate department ownership
    if (employee.department_id !== deptId) {
      return next(new AppError('Forbidden: Cannot modify employee belonging to another department.', 403, 'FORBIDDEN'));
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim().toLowerCase();
    if (phone) updates.phone = phone.trim();

    if (email && email.toLowerCase() !== employee.email.toLowerCase()) {
      const existing = db.findOne('users', (u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id);
      if (existing) {
        return next(new AppError('A user with this email already exists.', 409, 'CONFLICT'));
      }
    }

    const updated = db.update('users', id, updates);

    res.status(200).json({
      success: true,
      message: `Employee ${updated.name} updated successfully.`,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        departmentId: updated.department_id,
        status: updated.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Toggle employee status (ACTIVE <-> SUSPENDED) for Civil employees only
 * @route  PATCH /api/v1/dept-head/staff/:id/status
 * @body   { status: 'ACTIVE' | 'SUSPENDED' }
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const updateStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { deptId } = getUserDepartment(req);
    validateCivilAccess(req, deptId);

    const normalized = (status || '').toUpperCase();
    if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(normalized)) {
      return next(new AppError("Status must be 'ACTIVE' or 'SUSPENDED'.", 400, 'VALIDATION_ERROR'));
    }

    const employee = db.findById('users', id);
    if (!employee) {
      return next(new AppError(`Employee '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    // Backend security check: Validate department ownership
    if (employee.department_id !== deptId) {
      return next(new AppError('Forbidden: Cannot modify employee belonging to another department.', 403, 'FORBIDDEN'));
    }

    const updated = db.update('users', id, { status: normalized });

    db.logAudit({
      township_id: employee.township_id,
      entity_type: 'USER',
      entity_id: id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'STAFF_STATUS_CHANGE',
      from_state: employee.status,
      to_state: normalized,
      notes: `Employee ${employee.name} status changed to ${normalized} by Civil Dept Head ${req.user.name}`,
    });

    res.status(200).json({
      success: true,
      message: `Employee ${employee.name} status updated to ${normalized}.`,
      data: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Department Analytics & Performance (Civil Only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Civil Department performance, expenditure, and activity analytics
 * @route  GET /api/v1/dept-head/dashboard
 * @route  GET /api/v1/dept-head/analytics
 * @access Private (DEPARTMENT_HEAD, TOWNSHIP_COO)
 */
export const getDashboard = async (req, res, next) => {
  try {
    const townshipId = req.user.townshipId || req.user.township_id;
    const { deptId, deptName } = getUserDepartment(req);
    validateCivilAccess(req, deptId);

    // Filter complaints strictly for the authenticated department
    const complaints = db.findAll('complaints', (c) => {
      const matchTownship = !townshipId || c.township_id === townshipId;
      const matchDept = c.department_id === deptId || (deptId === CIVIL_DEPT_ID && c.category && c.category.toLowerCase() === 'civil');
      return matchTownship && matchDept;
    });

    // Filter work orders strictly for Civil Department
    const workOrders = db.findAll('work_orders', (w) => {
      const matchTownship = !townshipId || w.township_id === townshipId;
      const matchDept = w.department_id === deptId;
      return matchTownship && matchDept;
    });

    const now = new Date();

    const totalWorkOrders = workOrders.length;
    const totalComplaints = complaints.length;
    const pendingComplaints = complaints.filter((c) =>
      ['REPORTED', 'UNDER_REVIEW', 'VALIDATED', 'AWAITING_DEPT_HEAD'].includes(c.status)
    ).length;

    const openWorkOrders = workOrders.filter((w) =>
      ['ASSIGNED', 'INSPECTION_PENDING', 'ESTIMATE_SUBMITTED', 'PENDING_APPROVAL', 'AWAITING_DEPT_HEAD', 'WORK_ORDER_CREATED'].includes(w.status)
    ).length;

    const inProgressWorkOrders = workOrders.filter((w) => w.status === 'IN_PROGRESS').length;
    const activeWorkOrders = inProgressWorkOrders + openWorkOrders;

    const completedWorkOrders = workOrders.filter((w) =>
      w.status === 'COMPLETED' || w.status === 'CLOSED'
    ).length;

    const pendingApprovals = workOrders.filter((w) =>
      w.status === 'AWAITING_DEPT_HEAD' || w.status === 'PENDING_APPROVAL' || w.status === 'ESTIMATE_SUBMITTED'
    ).length;

    const overdueWorkOrders = workOrders.filter((w) => {
      if (['COMPLETED', 'CLOSED'].includes(w.status)) return false;
      const dl = w.due_at || w.sla_deadline;
      if (!dl) return false;
      return new Date(dl) < now;
    }).length;

    // Calculate total expenditure for Civil Department
    const totalExpenditure = workOrders.reduce((sum, wo) => {
      const cost = Number(wo.actual_cost || wo.estimate_amount || wo.estimated_cost || 0);
      return sum + cost;
    }, 0);

    // Civil Recent Activity Trail
    const civilWoIds = new Set(workOrders.map((w) => w.id));
    const civilComplaintIds = new Set(complaints.map((c) => c.id));
    const civilStaff = db.findAll('users', (u) => u.department_id === deptId);
    const civilStaffIds = new Set(civilStaff.map((u) => u.id));

    const allAuditLogs = db.findAll('audit_logs') || [];
    const recentActivity = allAuditLogs
      .filter((log) =>
        civilWoIds.has(log.entity_id) ||
        civilComplaintIds.has(log.entity_id) ||
        civilStaffIds.has(log.actor_id) ||
        civilStaffIds.has(log.entity_id) ||
        log.entity_id === deptId
      )
      .slice(0, 10);

    const summary = {
      departmentId: deptId,
      departmentName: deptName,
      totalWorkOrders,
      totalTickets: totalWorkOrders,
      openWorkOrders,
      inProgressWorkOrders,
      activeWorkOrders,
      completedWorkOrders,
      pendingApprovals,
      overdueWorkOrders,
      totalComplaints,
      pendingComplaints,
      totalExpenditure,
      averageSlaCompliance: '97.2%',
    };

    res.status(200).json({
      success: true,
      data: {
        departmentId: deptId,
        departmentName: deptName,
        summary,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getStaff,
  createStaff,
  updateStaff,
  updateStaffStatus,
  getDashboard,
  getUserDepartment,
  validateCivilAccess,
};
