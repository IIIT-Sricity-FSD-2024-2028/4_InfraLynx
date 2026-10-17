import express from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import {
  getOverview,
  getTenants, createTenant, getTenantById, updateTenant, updateTenantStatus, updateSubscription,
  getUsers, createUser, updateUserStatus, updateUser, resetUserPassword,
  getGlobalConfig, updateGlobalConfig,
  getDepartments, createDepartment,
  getContractors, createContractor,
  getAmcRates, updateAmcRate,
  getSystemHealth, getAuditLogs,
} from '../controllers/superAdminController.js';

const router = express.Router();

// All Super Admin routes require authentication + SUPER_ADMIN role
router.use(authenticate, requireSuperAdmin);

// ── Overview ──────────────────────────────────────────────────────────────────
router.get('/overview', getOverview);

// ── Tenant & Subscription Management ─────────────────────────────────────────
router.get('/tenants', getTenants);
router.post('/tenants', createTenant);
router.get('/tenants/:id', getTenantById);
router.put('/tenants/:id', updateTenant);
router.patch('/tenants/:id/status', updateTenantStatus);
router.patch('/tenants/:id/subscription', updateSubscription);

// ── User & Access Management ──────────────────────────────────────────────────
router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.patch('/users/:id/status', updateUserStatus);
router.post('/users/:id/reset-password', resetUserPassword);

// ── Global Config ─────────────────────────────────────────────────────────────
router.get('/config', getGlobalConfig);
router.put('/config', updateGlobalConfig);

// ── Departments ───────────────────────────────────────────────────────────────
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);

// ── Contractors ───────────────────────────────────────────────────────────────
router.get('/contractors', getContractors);
router.post('/contractors', createContractor);

// ── AMC Rate Catalog ──────────────────────────────────────────────────────────
router.get('/amc-rates', getAmcRates);
router.patch('/amc-rates/:id', updateAmcRate);

// ── System Health & Audit Logs ────────────────────────────────────────────────
router.get('/health', getSystemHealth);
router.get('/audit-logs', getAuditLogs);

export default router;
