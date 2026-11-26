import db from '../config/db.js';
import { hashPassword } from '../utils/auth.js';
import crypto from 'crypto';

const VALID_ROLES = ['RWA', 'DESK_CLERK', 'FIELD_CONTRACTOR', 'DEPARTMENT_HEAD', 'FINANCE_CLERK', 'TOWNSHIP_COO', 'SUPER_ADMIN'];
const VALID_BILLING_CYCLES = ['MONTHLY', 'YEARLY'];

const CONTRACTOR_TYPE_PRESETS = {
  Civil: {
    departmentName: 'Civil Infrastructure & Roads',
    departmentDesc: 'Arterial asphalt roads, stormwater drains, footpaths, and pedestrian walkways.',
    amcPrefix: 'AMC-CIV',
    amcTitle: 'Annual Civil Infrastructure, Road & Storm Drain AMC',
    defaultServices: ['Civil', 'Roads'],
    defaultRates: [
      { item_code: 'RATE-CIV-01', item_name: 'Bitumen Cold-Mix Asphalt Pothole Repair', service_type: 'Civil Works', unit: 'Sq.Meter', rate: 1200 },
      { item_code: 'RATE-CIV-02', item_name: 'Pre-Cast RCC Manhole Chamber Cover (600mm Circular)', service_type: 'Civil Works', unit: 'Unit', rate: 3200 },
    ],
  },
  Electrical: {
    departmentName: 'Electrical & Power Distribution',
    departmentDesc: 'High-mast streetlighting, 11kV distribution substations, feeder pillars, and transformer networks.',
    amcPrefix: 'AMC-ELE',
    amcTitle: 'Annual Streetlight, Feeder Pillars & High-Mast Power AMC',
    defaultServices: ['Electrical', 'Power Distribution'],
    defaultRates: [
      { item_code: 'RATE-ELE-01', item_name: 'Senior Electrical Technician / Wireman', service_type: 'Labour', unit: 'Hour', rate: 500 },
      { item_code: 'RATE-ELE-02', item_name: 'Streetlight 120W LED Luminaire & Surge Driver Replacement', service_type: 'Hardware', unit: 'Unit', rate: 1800 },
    ],
  },
  Water: {
    departmentName: 'Water Supply & Drainage Sanitation',
    departmentDesc: 'Potable drinking water networks, 150mm DI pipelines, sluice valves, and sewage treatment lines.',
    amcPrefix: 'AMC-WTR',
    amcTitle: 'Annual Potable Water Network, Sluice Valves & STP Drainage AMC',
    defaultServices: ['Water', 'Drainage Sanitation'],
    defaultRates: [
      { item_code: 'RATE-WTR-01', item_name: 'Pipe Repair & DI Pipeline Fitting (100mm/150mm)', service_type: 'Plumbing Works', unit: 'Unit', rate: 800 },
      { item_code: 'RATE-WTR-02', item_name: 'Heavy-Duty Cast Iron Sluice Valve Overhaul (150mm)', service_type: 'Plumbing Works', unit: 'Unit', rate: 2500 },
    ],
  },
  Horticulture: {
    departmentName: 'Horticulture & Urban Waste Management',
    departmentDesc: 'Community green belts, central parks, solid waste segregation, and composting units.',
    amcPrefix: 'AMC-SAN',
    amcTitle: 'Annual Horticulture Trimming, Green Waste Shredding & Sanitation AMC',
    defaultServices: ['Horticulture', 'Urban Waste Management'],
    defaultRates: [
      { item_code: 'RATE-SAN-01', item_name: 'Hydraulic Crane Mechanical Tree Pruning & Power Clearance', service_type: 'Horticulture Works', unit: 'Hour', rate: 1500 },
      { item_code: 'RATE-SAN-02', item_name: 'Mechanized Green Waste Shredding & Solid Waste Disposal', service_type: 'Waste Management', unit: 'Metric Tonne', rate: 2200 },
    ],
  },
};

const DEFAULT_TOWNSHIP_SLAS = [
  { severity: 'EMERGENCY', response_time_hours: 2, resolution_time_hours: 6 },
  { severity: 'HIGH', response_time_hours: 6, resolution_time_hours: 24 },
  { severity: 'MEDIUM', response_time_hours: 12, resolution_time_hours: 48 },
  { severity: 'LOW', response_time_hours: 24, resolution_time_hours: 72 },
];

function ensureTownshipDefaults(townshipId) {
  if (!townshipId) return [];
  const existingDepts = db.findAll('departments', (d) => d.township_id === townshipId);
  if (existingDepts.length === 0) {
    for (const preset of Object.values(CONTRACTOR_TYPE_PRESETS)) {
      existingDepts.push(
        db.insert('departments', {
          id: crypto.randomUUID(),
          township_id: townshipId,
          name: preset.departmentName,
          description: preset.departmentDesc,
          department_head_id: null,
          status: 'ACTIVE',
        })
      );
    }
  }

  const existingSlas = db.findAll('slas', (s) => s.township_id === townshipId);
  if (existingSlas.length === 0) {
    for (const sla of DEFAULT_TOWNSHIP_SLAS) {
      db.insert('slas', {
        id: crypto.randomUUID(),
        township_id: townshipId,
        ...sla,
      });
    }
  }
  return existingDepts;
}

function resolveContractorTypeAndServices(contractor_type, service_types) {
  const rawType = typeof contractor_type === 'string' ? contractor_type.trim() : '';
  const cleanedServices = Array.isArray(service_types)
    ? service_types.map((s) => String(s).trim()).filter(Boolean)
    : (typeof service_types === 'string' && service_types.trim()
      ? service_types.split(',').map((s) => s.trim()).filter(Boolean)
      : []);

  const matchedKey = Object.keys(CONTRACTOR_TYPE_PRESETS).find(
    (k) => k.toLowerCase() === rawType.toLowerCase()
  ) || (cleanedServices.length > 0
    ? Object.keys(CONTRACTOR_TYPE_PRESETS).find((k) =>
        cleanedServices.some((s) => s.toLowerCase().includes(k.toLowerCase()))
      )
    : null);

  const primaryType = matchedKey || rawType || cleanedServices[0] || '';
  const preset = matchedKey ? CONTRACTOR_TYPE_PRESETS[matchedKey] : null;
  const finalServices = Array.from(
    new Set(
      cleanedServices.length > 0
        ? cleanedServices
        : (preset ? preset.defaultServices : (primaryType ? [primaryType] : []))
    )
  );

  return { primaryType, preset, serviceTypes: finalServices };
}

function provisionContractorForTownship({
  township_id,
  company_name,
  contact_person,
  email,
  phone,
  gstin,
  address,
  contractor_type,
  service_types,
  department_id,
  admin,
}) {
  const departments = ensureTownshipDefaults(township_id);
  const { primaryType, preset, serviceTypes } = resolveContractorTypeAndServices(contractor_type, service_types);

  const contractor = db.insert('contractors', {
    id: crypto.randomUUID(),
    township_id,
    company_name: company_name.trim(),
    contact_person: (contact_person || '').trim(),
    email: email.trim().toLowerCase(),
    phone: (phone || '').trim(),
    gstin: (gstin || '').trim(),
    address: (address || '').trim(),
    status: 'ACTIVE',
  });

  for (const svc of serviceTypes) {
    db.insert('contractor_services', {
      id: crypto.randomUUID(),
      contractor_id: contractor.id,
      service_type: svc,
    });
  }

  // Resolve matching department for this contractor's trade/type
  let matchedDept = department_id
    ? departments.find((d) => d.id === department_id)
    : null;
  if (!matchedDept && preset) {
    matchedDept = departments.find((d) => d.name.toLowerCase() === preset.departmentName.toLowerCase());
  }
  if (!matchedDept && primaryType) {
    const typeLower = primaryType.toLowerCase();
    matchedDept = departments.find((d) => d.name.toLowerCase().includes(typeLower));
  }
  if (!matchedDept && departments.length > 0) {
    matchedDept = departments[0];
  }

  // Create active AMC(s) & starter DSR rate cards for all selected trade presets (or primary type)
  const today = new Date();
  const nextYear = new Date(today.getTime() + 365 * 24 * 3600 * 1000);
  const matchedPresetKeys = Array.from(
    new Set(
      [
        ...(preset ? [primaryType] : []),
        ...serviceTypes
          .map((svc) =>
            Object.keys(CONTRACTOR_TYPE_PRESETS).find(
              (k) => k.toLowerCase() === svc.toLowerCase() || svc.toLowerCase().includes(k.toLowerCase())
            )
          )
          .filter(Boolean),
      ]
    )
  );

  const amcPlansToCreate = matchedPresetKeys.length > 0
    ? matchedPresetKeys.map((key) => {
        const p = CONTRACTOR_TYPE_PRESETS[key];
        const dept = departments.find((d) => d.name.toLowerCase() === p.departmentName.toLowerCase()) || matchedDept;
        return { key, preset: p, dept };
      })
    : [{ key: primaryType || 'General', preset: null, dept: matchedDept }];

  let primaryAmc = null;
  for (const plan of amcPlansToCreate) {
    const contractSuffix = crypto.randomUUID().slice(0, 6).toUpperCase();
    const contractPrefix = plan.preset?.amcPrefix || 'AMC-GEN';
    const createdAmc = db.insert('amcs', {
      id: crypto.randomUUID(),
      township_id,
      contractor_id: contractor.id,
      contract_number: `${contractPrefix}-${today.getFullYear()}-${contractSuffix}`,
      department_id: plan.dept ? plan.dept.id : null,
      title: plan.preset
        ? `${plan.preset.amcTitle} — ${contractor.company_name}`
        : `${plan.key} Maintenance AMC — ${contractor.company_name}`,
      start_date: today.toISOString().slice(0, 10),
      end_date: nextYear.toISOString().slice(0, 10),
      status: 'ACTIVE',
    });
    if (!primaryAmc) primaryAmc = createdAmc;

    const rateTemplates = plan.preset?.defaultRates || CONTRACTOR_TYPE_PRESETS.Civil.defaultRates;
    for (const tpl of rateTemplates) {
      db.insert('amc_rates', {
        id: crypto.randomUUID(),
        amc_id: createdAmc.id,
        item_code: tpl.item_code,
        item_name: tpl.item_name,
        service_type: tpl.service_type,
        unit: tpl.unit,
        rate: tpl.rate,
        effective_from: today.toISOString().slice(0, 10),
        status: 'ACTIVE',
      });
    }
  }
  const amc = primaryAmc;

  if (admin) {
    auditSA(admin, 'CONTRACTOR_CREATED', 'CONTRACTOR', contractor.id, {
      tenant_id: township_id,
      new_value: { company_name: contractor.company_name, email: contractor.email, contractor_type: primaryType, service_types: serviceTypes },
      notes: `Contractor '${contractor.company_name}' (${serviceTypes.join(', ')}) registered.`,
    });
  }

  return {
    contractor: {
      ...contractor,
      contractor_type: primaryType || serviceTypes[0] || 'General',
      service_types: serviceTypes,
    },
    department: matchedDept || null,
    amc,
    serviceTypes,
  };
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidDate(value) {
  if (typeof value !== 'string' || !value.length) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value.slice(0, 10);
}

function positiveInteger(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function validateUserAssignment({ role, township_id, department_id, contractor_id, contractor_type, service_types, contractor_company, company_name }) {
  if (!VALID_ROLES.includes(role)) return 'Invalid role.';

  if (role === 'SUPER_ADMIN') {
    if (township_id || department_id || contractor_id) return 'Super Admin accounts cannot be assigned to a township, department, or contractor.';
    return null;
  }

  if (!township_id) return 'A township is required for tenant-level accounts.';
  const township = db.findById('townships', township_id);
  if (!township) return 'Township not found.';

  if (department_id) {
    if (!['DESK_CLERK', 'FINANCE_CLERK', 'DEPARTMENT_HEAD', 'FIELD_CONTRACTOR'].includes(role)) {
      return 'Only department staff or contractor roles can be assigned to a department.';
    }
    const department = db.findById('departments', department_id);
    if (!department || department.township_id !== township_id) return 'Department must belong to the selected township.';
  }
  if (role === 'DEPARTMENT_HEAD' && !department_id) return 'A department is required for the DEPARTMENT_HEAD role.';

  if (role === 'FIELD_CONTRACTOR') {
    if (contractor_id) {
      const contractor = db.findById('contractors', contractor_id);
      if (!contractor || contractor.township_id !== township_id) return 'Contractor must belong to the selected township.';
    } else {
      const { primaryType, serviceTypes } = resolveContractorTypeAndServices(contractor_type, service_types);
      const firmName = (contractor_company || company_name || '').trim();
      if (!primaryType && serviceTypes.length === 0) {
        return 'Select an existing contractor account or choose a contractor type.';
      }
      if (!firmName) {
        return 'Contractor company / firm name is required when creating a new contractor.';
      }
    }
  } else if (contractor_id) {
    return 'Only FIELD_CONTRACTOR accounts can be assigned to a contractor.';
  }

  return null;
}

/**
 * Helper: record a super-admin audit event
 */
function auditSA(admin, action, entity_type, entity_id, opts = {}) {
  db.logSuperAudit({
    admin_id: admin.id,
    admin_name: admin.name,
    admin_role: admin.role,
    action,
    entity_type,
    entity_id: entity_id || 'N/A',
    tenant_id: opts.tenant_id || null,
    previous_value: opts.previous_value || null,
    new_value: opts.new_value || null,
    outcome: opts.outcome || 'SUCCESS',
    notes: opts.notes || null,
  });
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/super-admin/overview
 * Platform-wide summary metrics
 */
export const getOverview = async (req, res, next) => {
  try {
    const townships = db.findAll('townships');
    const subscriptions = db.findAll('tenant_subscriptions');
    const users = db.findAll('users');
    const complaints = db.findAll('complaints');
    const auditLogs = db.findAll('super_audit_logs');

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
    const expiringSoon = subscriptions.filter((s) => {
      if (!s.expiry_date) return false;
      const exp = new Date(s.expiry_date);
      return exp > now && exp <= thirtyDaysFromNow && s.status === 'ACTIVE';
    });
    const overdue = subscriptions.filter((s) => {
      if (!s.expiry_date) return false;
      return new Date(s.expiry_date) < now && s.status !== 'SUSPENDED';
    });
    const suspended = townships.filter((t) => t.status === 'SUSPENDED');

    // Users by role (exclude SUPER_ADMIN from the count)
    const roleBreakdown = {};
    users
      .filter((u) => u.role !== 'SUPER_ADMIN')
      .forEach((u) => {
        roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
      });

    const dbHealth = await db.testConnection();

    // Recent super audit logs (last 15)
    const recentActivity = [...auditLogs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 15);

    res.status(200).json({
      success: true,
      data: {
        totalTownships: townships.length,
        activeSubscriptions: activeSubs.length,
        expiringSoon: expiringSoon.length,
        overdue: overdue.length,
        suspended: suspended.length,
        totalUsers: users.filter((u) => u.role !== 'SUPER_ADMIN').length,
        roleBreakdown,
        totalComplaints: complaints.length,
        dbHealth: {
          status: dbHealth ? 'HEALTHY' : 'UNAVAILABLE',
          mode: 'POSTGRESQL',
          postgresConfigured: Boolean(db.pool),
        },
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── TENANTS & SUBSCRIPTIONS ──────────────────────────────────────────────────

/**
 * GET /api/v1/super-admin/tenants
 * All tenants with enriched subscription data
 */
export const getTenants = async (req, res, next) => {
  try {
    const townships = db.findAll('townships');
    const subscriptions = db.findAll('tenant_subscriptions');
    const users = db.findAll('users');
    const complaints = db.findAll('complaints');

    const enriched = townships.map((t) => {
      const sub = subscriptions.find((s) => s.township_id === t.id) || null;
      const userCount = users.filter((u) => u.township_id === t.id).length;
      const complaintCount = complaints.filter((c) => c.township_id === t.id).length;
      return {
        ...t,
        subscription: sub,
        userCount,
        complaintCount,
      };
    });

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/super-admin/tenants
 * Onboard a new tenant
 */
export const createTenant = async (req, res, next) => {
  try {
    const {
      name, address, contact_email, contact_phone, legal_entity,
      primary_contact, plan_label, billing_cycle, start_date, expiry_date,
      max_users, max_complaints_monthly, max_storage_gb, status,
    } = req.body;

    // Validation
    if (typeof name !== 'string' || !name.trim() || !contact_email || !plan_label || !billing_cycle || !start_date || !expiry_date) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: name, contact_email, plan_label, billing_cycle, start_date, expiry_date', statusCode: 400 },
      });
    }
    if (!isValidEmail(contact_email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid contact email format.', statusCode: 400 },
      });
    }
    if (!isValidDate(start_date) || !isValidDate(expiry_date) || new Date(expiry_date) <= new Date(start_date)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Start and expiry dates must be valid, and expiry must be after start.', statusCode: 400 },
      });
    }

    const plans = db.findAll('subscription_plans');
    const plan = plans.find((p) => p.plan_label === plan_label);
    if (!plan) {
      return res.status(400).json({ success: false, error: { message: 'Select a valid subscription plan.', statusCode: 400 } });
    }
    if (!VALID_BILLING_CYCLES.includes(billing_cycle)) {
      return res.status(400).json({ success: false, error: { message: 'Billing cycle must be MONTHLY or YEARLY.', statusCode: 400 } });
    }
    if (status !== undefined && !['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Tenant status must be ACTIVE or SUSPENDED.', statusCode: 400 } });
    }

    const userLimit = positiveInteger(max_users, 10);
    const complaintLimit = positiveInteger(max_complaints_monthly, 100);
    const storageLimit = positiveInteger(max_storage_gb, 5);
    if (!userLimit || !complaintLimit || !storageLimit) {
      return res.status(400).json({ success: false, error: { message: 'Subscription limits must be positive whole numbers.', statusCode: 400 } });
    }

    const township = db.insert('townships', {
      id: crypto.randomUUID(),
      name: name.trim(),
      address: address || '',
      contact_email: contact_email.trim().toLowerCase(),
      contact_phone: contact_phone || '',
      status: status || 'ACTIVE',
      subscription_plan_id: plan.id,
    });

    ensureTownshipDefaults(township.id);

    const sub = db.insert('tenant_subscriptions', {
      id: crypto.randomUUID(),
      township_id: township.id,
      plan_id: plan.id,
      plan_label,
      billing_cycle,
      status: status || 'ACTIVE',
      start_date,
      expiry_date,
      primary_contact: primary_contact || '',
      contact_email: contact_email.trim().toLowerCase(),
      contact_phone: contact_phone || '',
      legal_entity: legal_entity || '',
      max_users: userLimit,
      max_complaints_monthly: complaintLimit,
      max_storage_gb: storageLimit,
      history: [{ action: 'CREATED', date: new Date().toISOString(), note: 'Tenant onboarded.', by: req.user.email }],
    });

    auditSA(req.user, 'TENANT_CREATED', 'TOWNSHIP', township.id, {
      tenant_id: township.id,
      new_value: { name, plan_label, billing_cycle },
      notes: `New tenant '${name}' onboarded with ${plan_label} plan.`,
    });

    await db.waitForPendingWrites();
    res.status(201).json({ success: true, data: { township, subscription: sub } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/super-admin/tenants/:id
 */
export const getTenantById = async (req, res, next) => {
  try {
    const township = db.findById('townships', req.params.id);
    if (!township) {
      return res.status(404).json({ success: false, error: { message: 'Tenant not found.', statusCode: 404 } });
    }
    const sub = db.findOne('tenant_subscriptions', (s) => s.township_id === township.id);
    const users = db.findAll('users', (u) => u.township_id === township.id);
    const departments = db.findAll('departments', (d) => d.township_id === township.id);
    const complaints = db.findAll('complaints', (c) => c.township_id === township.id);

    res.status(200).json({
      success: true,
      data: {
        ...township,
        subscription: sub || null,
        userCount: users.length,
        departmentCount: departments.length,
        complaintCount: complaints.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/super-admin/tenants/:id
 * Edit tenant details and/or subscription
 */
export const updateTenant = async (req, res, next) => {
  try {
    const township = db.findById('townships', req.params.id);
    if (!township) {
      return res.status(404).json({ success: false, error: { message: 'Tenant not found.', statusCode: 404 } });
    }

    const { name, address, contact_email, contact_phone, plan_label, billing_cycle, start_date, expiry_date, max_users, max_complaints_monthly, max_storage_gb } = req.body;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ success: false, error: { message: 'Tenant name cannot be empty.', statusCode: 400 } });
    }
    if (contact_email !== undefined && !isValidEmail(contact_email)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid contact email format.', statusCode: 400 } });
    }

    const prevTownship = { ...township };
    const sub = db.findOne('tenant_subscriptions', (s) => s.township_id === township.id);
    const plan = plan_label ? db.findOne('subscription_plans', (p) => p.plan_label === plan_label) : null;
    if (plan_label && !plan) {
      return res.status(400).json({ success: false, error: { message: 'Select a valid subscription plan.', statusCode: 400 } });
    }
    if (billing_cycle && !VALID_BILLING_CYCLES.includes(billing_cycle)) {
      return res.status(400).json({ success: false, error: { message: 'Billing cycle must be MONTHLY or YEARLY.', statusCode: 400 } });
    }
    if (start_date !== undefined && !isValidDate(start_date)) {
      return res.status(400).json({ success: false, error: { message: 'Start date must be valid.', statusCode: 400 } });
    }
    if (expiry_date !== undefined && !isValidDate(expiry_date)) {
      return res.status(400).json({ success: false, error: { message: 'Expiry date must be valid.', statusCode: 400 } });
    }
    if ((start_date || sub?.start_date) && (expiry_date || sub?.expiry_date) && new Date(expiry_date || sub.expiry_date) <= new Date(start_date || sub.start_date)) {
      return res.status(400).json({ success: false, error: { message: 'Expiry date must be after start date.', statusCode: 400 } });
    }
    const userLimit = max_users === undefined ? undefined : positiveInteger(max_users);
    const complaintLimit = max_complaints_monthly === undefined ? undefined : positiveInteger(max_complaints_monthly);
    const storageLimit = max_storage_gb === undefined ? undefined : positiveInteger(max_storage_gb);
    if ([userLimit, complaintLimit, storageLimit].some((value) => value === null)) {
      return res.status(400).json({ success: false, error: { message: 'Subscription limits must be positive whole numbers.', statusCode: 400 } });
    }

    const updatedTownship = db.update('townships', township.id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(address !== undefined && { address }),
      ...(contact_email !== undefined && { contact_email: contact_email.trim() }),
      ...(contact_phone !== undefined && { contact_phone }),
      ...(plan && { subscription_plan_id: plan.id }),
    });

    let updatedSub = sub;

    if (sub) {
      const subUpdates = {};
      if (plan_label) subUpdates.plan_label = plan_label;
      if (billing_cycle) subUpdates.billing_cycle = billing_cycle;
      if (start_date) subUpdates.start_date = start_date;
      if (expiry_date) subUpdates.expiry_date = expiry_date;
      if (userLimit !== undefined) subUpdates.max_users = userLimit;
      if (complaintLimit !== undefined) subUpdates.max_complaints_monthly = complaintLimit;
      if (storageLimit !== undefined) subUpdates.max_storage_gb = storageLimit;

      if (Object.keys(subUpdates).length > 0) {
        if (plan) subUpdates.plan_id = plan.id;

        const historyEntry = { action: 'UPDATED', date: new Date().toISOString(), note: `Updated by ${req.user.name}`, by: req.user.email };
        subUpdates.history = [...(sub.history || []), historyEntry];
        updatedSub = db.update('tenant_subscriptions', sub.id, subUpdates);
      }
    }

    auditSA(req.user, 'TENANT_UPDATED', 'TOWNSHIP', township.id, {
      tenant_id: township.id,
      previous_value: prevTownship,
      new_value: updatedTownship,
      notes: `Tenant '${township.name}' updated.`,
    });

    await db.waitForPendingWrites();
    res.status(200).json({ success: true, data: { township: updatedTownship, subscription: updatedSub } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/super-admin/tenants/:id/status
 * Suspend or reactivate a tenant
 */
export const updateTenantStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const allowedStatuses = ['ACTIVE', 'SUSPENDED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`, statusCode: 400 },
      });
    }

    const township = db.findById('townships', req.params.id);
    if (!township) {
      return res.status(404).json({ success: false, error: { message: 'Tenant not found.', statusCode: 404 } });
    }

    const prevStatus = township.status;
    const updated = db.update('townships', township.id, { status });

    const sub = db.findOne('tenant_subscriptions', (s) => s.township_id === township.id);
    let updatedSub = sub;
    if (sub) {
      const subStatus = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
      const historyEntry = {
        action: status === 'SUSPENDED' ? 'SUSPENDED' : 'REACTIVATED',
        date: new Date().toISOString(),
        note: reason || `Status changed to ${status} by ${req.user.name}`,
        by: req.user.email,
      };
      updatedSub = db.update('tenant_subscriptions', sub.id, {
        status: subStatus,
        history: [...(sub.history || []), historyEntry],
      });
    }

    const action = status === 'SUSPENDED' ? 'TENANT_SUSPENDED' : 'TENANT_REACTIVATED';
    auditSA(req.user, action, 'TOWNSHIP', township.id, {
      tenant_id: township.id,
      previous_value: { status: prevStatus },
      new_value: { status },
      notes: reason || `Tenant status changed from ${prevStatus} to ${status}.`,
    });

    await db.waitForPendingWrites();
    res.status(200).json({ success: true, data: { township: updated, subscription: updatedSub } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/super-admin/tenants/:id/subscription
 * Upgrade or renew subscription
 */
export const updateSubscription = async (req, res, next) => {
  try {
    const { plan_label, billing_cycle, expiry_date, status, reason } = req.body;

    const township = db.findById('townships', req.params.id);
    if (!township) {
      return res.status(404).json({ success: false, error: { message: 'Tenant not found.', statusCode: 404 } });
    }

    const sub = db.findOne('tenant_subscriptions', (s) => s.township_id === township.id);
    if (!sub) {
      return res.status(404).json({ success: false, error: { message: 'Subscription not found.', statusCode: 404 } });
    }

    if (plan_label && !db.findOne('subscription_plans', (p) => p.plan_label === plan_label)) {
      return res.status(400).json({ success: false, error: { message: 'Select a valid subscription plan.', statusCode: 400 } });
    }
    if (billing_cycle && !VALID_BILLING_CYCLES.includes(billing_cycle)) {
      return res.status(400).json({ success: false, error: { message: 'Billing cycle must be MONTHLY or YEARLY.', statusCode: 400 } });
    }
    if (expiry_date !== undefined && (!isValidDate(expiry_date) || new Date(expiry_date) <= new Date(sub.start_date))) {
      return res.status(400).json({ success: false, error: { message: 'Expiry date must be valid and after the subscription start date.', statusCode: 400 } });
    }
    if (status !== undefined && !['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Subscription status must be ACTIVE or SUSPENDED.', statusCode: 400 } });
    }

    const prevSub = { plan_label: sub.plan_label, billing_cycle: sub.billing_cycle, expiry_date: sub.expiry_date, status: sub.status };
    const updates = {};
    if (plan_label) updates.plan_label = plan_label;
    if (billing_cycle) updates.billing_cycle = billing_cycle;
    if (expiry_date) updates.expiry_date = expiry_date;
    if (status) updates.status = status;

    const plan = db.findOne('subscription_plans', (p) => p.plan_label === (plan_label || sub.plan_label));
    if (plan) updates.plan_id = plan.id;

    const historyEntry = {
      action: plan_label && plan_label !== sub.plan_label ? 'PLAN_CHANGED' : 'RENEWED',
      date: new Date().toISOString(),
      note: reason || `Updated by ${req.user.name}`,
      by: req.user.email,
    };
    updates.history = [...(sub.history || []), historyEntry];

    const updatedSub = db.update('tenant_subscriptions', sub.id, updates);
    if (plan_label) db.update('townships', township.id, { subscription_plan_id: plan.id });
    if (status) db.update('townships', township.id, { status });

    auditSA(req.user, 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION', sub.id, {
      tenant_id: township.id,
      previous_value: prevSub,
      new_value: updates,
      notes: reason || `Subscription updated for ${township.name}.`,
    });

    res.status(200).json({ success: true, data: updatedSub });
  } catch (err) {
    next(err);
  }
};

// ─── USER & ACCESS MANAGEMENT ─────────────────────────────────────────────────

/**
 * GET /api/v1/super-admin/users
 * Global user directory
 */
export const getUsers = async (req, res, next) => {
  try {
    const users = db.findAll('users');
    const townships = db.findAll('townships');
    const departments = db.findAll('departments');
    const contractors = db.findAll('contractors');

    const safeUsers = users.map((u) => {
      const township = townships.find((t) => t.id === u.township_id);
      const dept = departments.find((d) => d.id === u.department_id);
      const contractor = contractors.find((c) => c.id === u.contractor_id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        role: u.role,
        status: u.status,
        township_id: u.township_id,
        township_name: township ? township.name : null,
        department_id: u.department_id,
        department_name: dept ? dept.name : null,
        contractor_id: u.contractor_id,
        contractor_name: contractor ? contractor.company_name : null,
        sector: u.sector,
        phone: u.phone,
        last_login_at: u.last_login_at || null,
        created_at: u.created_at || null,
      };
    });

    res.status(200).json({ success: true, data: safeUsers });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/super-admin/users
 * Create a new user
 */
export const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      username,
      password,
      role,
      township_id,
      department_id,
      contractor_id,
      contractor_type,
      service_types,
      contractor_company,
      company_name,
      contractor_gstin,
      contractor_address,
      sector,
      phone,
    } = req.body;

    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !role) {
      return res.status(400).json({
        success: false,
        error: { message: 'Required: name, email, username, password, role', statusCode: 400 },
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid email format.', statusCode: 400 } });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: { message: 'Password must be at least 8 characters.', statusCode: 400 } });
    }

    const assignmentError = validateUserAssignment({
      role,
      township_id,
      department_id,
      contractor_id,
      contractor_type,
      service_types,
      contractor_company,
      company_name,
    });
    if (assignmentError) {
      return res.status(400).json({ success: false, error: { message: assignmentError, statusCode: 400 } });
    }

    // Check for duplicate email/username
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();
    const existing = db.findOne('users', (u) => u.email?.toLowerCase() === normalizedEmail || u.username?.toLowerCase() === normalizedUsername);
    if (existing) {
      return res.status(409).json({ success: false, error: { message: 'A user with this email or username already exists.', statusCode: 409 } });
    }

    let resolvedContractorId = contractor_id || null;
    let resolvedDepartmentId = department_id || null;
    let provisionedContractor = null;

    if (role === 'FIELD_CONTRACTOR' && !resolvedContractorId) {
      const provisioned = provisionContractorForTownship({
        township_id,
        company_name: (contractor_company || company_name).trim(),
        contact_person: name.trim(),
        email: normalizedEmail,
        phone: phone || '',
        gstin: contractor_gstin || '',
        address: contractor_address || sector || '',
        contractor_type,
        service_types,
        department_id: resolvedDepartmentId,
        admin: req.user,
      });
      resolvedContractorId = provisioned.contractor.id;
      if (!resolvedDepartmentId && provisioned.department) {
        resolvedDepartmentId = provisioned.department.id;
      }
      provisionedContractor = provisioned.contractor;
    } else if (role === 'FIELD_CONTRACTOR' && resolvedContractorId && !resolvedDepartmentId) {
      const existingAmc = db.findOne('amcs', (a) => a.contractor_id === resolvedContractorId && a.department_id);
      if (existingAmc) {
        resolvedDepartmentId = existingAmc.department_id;
      }
    }

    const password_hash = await hashPassword(password);

    const newUser = db.insert('users', {
      id: crypto.randomUUID(),
      township_id: township_id || null,
      name: name.trim(),
      email: normalizedEmail,
      username: normalizedUsername,
      password_hash,
      role,
      department_id: resolvedDepartmentId || null,
      contractor_id: resolvedContractorId || null,
      sector: sector || null,
      phone: phone || null,
      status: 'ACTIVE',
    });

    auditSA(req.user, 'USER_CREATED', 'USER', newUser.id, {
      tenant_id: township_id || null,
      new_value: { name, email, role, township_id, contractor_id: resolvedContractorId },
      notes: `User '${name}' created with role ${role}.`,
    });

    await db.waitForPendingWrites();
    const { password_hash: _omit, ...safeUser } = newUser;
    res.status(201).json({
      success: true,
      data: {
        ...safeUser,
        ...(provisionedContractor ? { contractor: provisionedContractor } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/super-admin/users/:id/status
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const allowed = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: { message: `Invalid status. Allowed: ${allowed.join(', ')}`, statusCode: 400 } });
    }

    const user = db.findById('users', req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found.', statusCode: 404 } });
    }

    // Do not allow a platform administrator to lock out their own active session.
    if (user.id === req.user.id && status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: { message: 'You cannot deactivate or suspend your own Super Admin account.', statusCode: 400 } });
    }

    // Super Admin accounts require a separate, deliberate account recovery process.
    if (user.role === 'SUPER_ADMIN' && req.user.id !== user.id) {
      return res.status(403).json({ success: false, error: { message: 'Cannot modify another Super Admin account through this endpoint.', statusCode: 403 } });
    }

    const prevStatus = user.status;
    const updated = db.update('users', user.id, { status });
    const { password_hash: _omit, ...safeUser } = updated;

    auditSA(req.user, `USER_STATUS_${status}`, 'USER', user.id, {
      tenant_id: user.township_id,
      previous_value: { status: prevStatus },
      new_value: { status },
      notes: reason || `User status changed from ${prevStatus} to ${status}.`,
    });

    res.status(200).json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/super-admin/users/:id
 * Update user role, department, township
 */
export const updateUser = async (req, res, next) => {
  try {
    const user = db.findById('users', req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found.', statusCode: 404 } });
    }

    const { name, role, township_id, department_id, contractor_id, sector, phone } = req.body;
    if (user.role === 'SUPER_ADMIN' && user.id !== req.user.id) {
      return res.status(403).json({ success: false, error: { message: 'Cannot modify another Super Admin account through this endpoint.', statusCode: 403 } });
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ success: false, error: { message: 'Name cannot be empty.', statusCode: 400 } });
    }

    const targetRole = role || user.role;
    if (user.id === req.user.id && targetRole !== 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, error: { message: 'You cannot remove the Super Admin role from your own account.', statusCode: 400 } });
    }
    const targetTownshipId = targetRole === 'SUPER_ADMIN' ? null : (township_id !== undefined ? township_id : user.township_id);
    const targetDepartmentId = targetRole === 'SUPER_ADMIN' ? null : (department_id !== undefined ? department_id : user.department_id);
    const targetContractorId = targetRole !== 'FIELD_CONTRACTOR'
      ? null
      : (contractor_id !== undefined ? contractor_id : user.contractor_id);
    const assignmentError = validateUserAssignment({
      role: targetRole,
      township_id: targetTownshipId,
      department_id: targetDepartmentId,
      contractor_id: targetContractorId,
    });
    if (assignmentError) {
      return res.status(400).json({ success: false, error: { message: assignmentError, statusCode: 400 } });
    }

    const prevUser = { role: user.role, township_id: user.township_id, department_id: user.department_id };

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (role) updates.role = targetRole;
    if (role || township_id !== undefined) updates.township_id = targetTownshipId;
    if (role || department_id !== undefined) updates.department_id = targetDepartmentId;
    if (role || contractor_id !== undefined) updates.contractor_id = targetContractorId;
    if (sector !== undefined) updates.sector = sector;
    if (phone !== undefined) updates.phone = phone;

    const updated = db.update('users', user.id, updates);
    const { password_hash: _omit, ...safeUser } = updated;

    auditSA(req.user, 'USER_UPDATED', 'USER', user.id, {
      tenant_id: targetTownshipId || user.township_id,
      previous_value: prevUser,
      new_value: updates,
      notes: `User '${user.name}' profile/role updated.`,
    });

    res.status(200).json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/super-admin/users/:id/reset-password
 * Initiate secure password reset (sets a new bcrypt hash)
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ success: false, error: { message: 'New password must be at least 8 characters.', statusCode: 400 } });
    }

    const user = db.findById('users', req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found.', statusCode: 404 } });
    }
    if (user.role === 'SUPER_ADMIN' && req.user.id !== user.id) {
      return res.status(403).json({ success: false, error: { message: 'Cannot reset another Super Admin account through this endpoint.', statusCode: 403 } });
    }

    const password_hash = await hashPassword(new_password);
    db.update('users', user.id, { password_hash });

    auditSA(req.user, 'USER_PASSWORD_RESET', 'USER', user.id, {
      tenant_id: user.township_id,
      notes: `Password reset initiated for user '${user.name}' (${user.email}).`,
    });

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── GLOBAL CONFIG ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/super-admin/config
 */
export const getGlobalConfig = async (req, res, next) => {
  try {
    const configs = db.findAll('global_config');
    res.status(200).json({ success: true, data: configs });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/super-admin/config
 * Bulk update multiple config keys
 */
export const updateGlobalConfig = async (req, res, next) => {
  try {
    const { updates, reason } = req.body;
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: { message: 'Provide updates as an object: { key: value }', statusCode: 400 } });
    }

    const entries = Object.entries(updates);
    if (entries.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'At least one known configuration key is required.', statusCode: 400 } });
    }
    const validated = [];
    for (const [key, newVal] of entries) {
      const config = db.findOne('global_config', (c) => c.key === key);
      if (!config) {
        return res.status(400).json({ success: false, error: { message: `Unknown configuration key: ${key}.`, statusCode: 400 } });
      }
      const num = Number(newVal);
      if (newVal === '' || !Number.isFinite(num) || num < 0) {
        return res.status(400).json({ success: false, error: { message: `Invalid value for ${key}: must be a non-negative number.`, statusCode: 400 } });
      }
      if ((config.category === 'SLA' || key === 'AUTO_CLOSURE_DAYS') && !Number.isSafeInteger(num)) {
        return res.status(400).json({ success: false, error: { message: `Invalid value for ${key}: must be a whole number.`, statusCode: 400 } });
      }
      validated.push({ config, key, value: String(newVal) });
    }

    const changed = [];
    for (const { config, key, value } of validated) {

      const prevVal = config.value;
      db.update('global_config', config.id, {
        value,
        updated_by: req.user.email,
        updated_at: new Date().toISOString(),
      });

      auditSA(req.user, 'CONFIG_UPDATED', 'GLOBAL_CONFIG', config.id, {
        previous_value: { key, value: prevVal },
        new_value: { key, value },
        notes: reason || `Config key '${key}' updated from '${prevVal}' to '${value}'.`,
      });

      changed.push({ key, previous: prevVal, current: value });
    }

    const updatedConfigs = db.findAll('global_config');
    res.status(200).json({ success: true, data: updatedConfigs, changed });
  } catch (err) {
    next(err);
  }
};

// ─── DEPARTMENTS & CONTRACTORS ────────────────────────────────────────────────

/**
 * GET /api/v1/super-admin/departments
 */
export const getDepartments = async (req, res, next) => {
  try {
    const departments = db.findAll('departments');
    const townships = db.findAll('townships');
    const users = db.findAll('users');

    const enriched = departments.map((d) => {
      const township = townships.find((t) => t.id === d.township_id);
      const head = users.find((u) => u.id === d.department_head_id);
      return {
        ...d,
        township_name: township ? township.name : null,
        head_name: head ? head.name : null,
      };
    });

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/super-admin/departments
 */
export const createDepartment = async (req, res, next) => {
  try {
    const { township_id, name, description } = req.body;
    if (!township_id || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'township_id and name are required.', statusCode: 400 } });
    }

    const township = db.findById('townships', township_id);
    if (!township) {
      return res.status(404).json({ success: false, error: { message: 'Township not found.', statusCode: 404 } });
    }
    const duplicate = db.findOne('departments', (item) => item.township_id === township_id && item.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      return res.status(409).json({ success: false, error: { message: 'A department with this name already exists in the township.', statusCode: 409 } });
    }

    const dept = db.insert('departments', {
      id: crypto.randomUUID(),
      township_id,
      name: name.trim(),
      description: description || '',
      department_head_id: null,
      status: 'ACTIVE',
    });

    auditSA(req.user, 'DEPARTMENT_CREATED', 'DEPARTMENT', dept.id, {
      tenant_id: township_id,
      new_value: { name, township_id },
      notes: `Department '${name}' created in ${township.name}.`,
    });

    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/super-admin/contractors
 */
export const getContractors = async (req, res, next) => {
  try {
    const contractors = db.findAll('contractors');
    const services = db.findAll('contractor_services');
    const amcs = db.findAll('amcs');
    const departments = db.findAll('departments');
    const townships = db.findAll('townships');

    const enriched = contractors.map((c) => {
      const explicitServices = services
        .filter((s) => s.contractor_id === c.id && s.service_type)
        .map((s) => s.service_type);

      const contractorAmcs = amcs.filter((a) => a.contractor_id === c.id);
      const deptServices = [];
      for (const a of contractorAmcs) {
        const dept = departments.find((d) => d.id === a.department_id);
        if (!dept?.name) continue;
        const lower = dept.name.toLowerCase();
        if (lower.includes('civil')) deptServices.push('Civil');
        else if (lower.includes('elect')) deptServices.push('Electrical');
        else if (lower.includes('water')) deptServices.push('Water');
        else if (lower.includes('hort') || lower.includes('waste')) deptServices.push('Horticulture');
      }

      const serviceTypes = Array.from(new Set([...explicitServices, ...deptServices]));
      const township = townships.find((t) => t.id === c.township_id);

      return {
        ...c,
        service_types: serviceTypes,
        contractor_type: serviceTypes[0] || 'General',
        township_name: township ? township.name : null,
        amc_count: contractorAmcs.length,
      };
    });

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/super-admin/contractors
 */
export const createContractor = async (req, res, next) => {
  try {
    const { township_id, company_name, contact_person, email, phone, gstin, address, contractor_type, service_types, department_id } = req.body;
    if (typeof company_name !== 'string' || !company_name.trim() || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: { message: 'company_name and email are required.', statusCode: 400 } });
    }

    if (!township_id || !db.findById('townships', township_id)) {
      return res.status(404).json({ success: false, error: { message: 'Valid township_id is required.', statusCode: 404 } });
    }

    const { primaryType, serviceTypes } = resolveContractorTypeAndServices(contractor_type, service_types);
    if (!primaryType && serviceTypes.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'contractor_type or service_types is required.', statusCode: 400 } });
    }

    const provisioned = provisionContractorForTownship({
      township_id,
      company_name,
      contact_person,
      email,
      phone,
      gstin,
      address,
      contractor_type: primaryType,
      service_types: serviceTypes,
      department_id,
      admin: req.user,
    });

    await db.waitForPendingWrites();
    res.status(201).json({ success: true, data: provisioned.contractor });
  } catch (err) {
    next(err);
  }
};

// ─── AMC RATE CATALOG ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/super-admin/amc-rates
 */
export const getAmcRates = async (req, res, next) => {
  try {
    const rates = db.findAll('amc_rates');
    const amcs = db.findAll('amcs');
    const enriched = rates.map((r) => {
      const amc = amcs.find((a) => a.id === r.amc_id);
      return { ...r, amc_title: amc ? amc.title : null };
    });
    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/super-admin/amc-rates/:id
 * Edit an AMC rate — does NOT retroactively alter existing approved estimates.
 */
export const updateAmcRate = async (req, res, next) => {
  try {
    const { rate, item_name, unit, service_type, reason } = req.body;

    const existing = db.findById('amc_rates', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'AMC Rate not found.', statusCode: 404 } });
    }

    if (rate !== undefined && (!Number.isFinite(Number(rate)) || Number(rate) < 0)) {
      return res.status(400).json({ success: false, error: { message: 'Rate must be a non-negative number.', statusCode: 400 } });
    }

    const prevRate = existing.rate;
    const updates = {};
    if (rate !== undefined) updates.rate = Number(rate);
    if (item_name) updates.item_name = item_name;
    if (unit) updates.unit = unit;
    if (service_type) updates.service_type = service_type;

    const updated = db.update('amc_rates', existing.id, updates);

    auditSA(req.user, 'AMC_RATE_UPDATED', 'AMC_RATE', existing.id, {
      previous_value: { item_name: existing.item_name, rate: prevRate },
      new_value: updates,
      notes: reason || `AMC rate for '${existing.item_name}' updated from ₹${prevRate} to ₹${rate}. NOTE: Existing approved estimates are NOT retroactively altered.`,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ─── SYSTEM HEALTH & AUDIT LOGS ──────────────────────────────────────────────

/**
 * GET /api/v1/super-admin/health
 */
export const getSystemHealth = async (req, res, next) => {
  try {
    const start = Date.now();
    const dbOk = await db.testConnection();
    const responseMs = Date.now() - start;

    const dbMode = 'POSTGRESQL';

    res.status(200).json({
      success: true,
      data: {
        api: { status: 'UP', timestamp: new Date().toISOString() },
        database: {
          status: dbOk ? 'HEALTHY' : 'UNAVAILABLE',
          mode: dbMode,
          postgresConfigured: true,
          responseMs,
          note: 'Connected to Neon Cloud PostgreSQL.',
        },
        escalation: {
          status: 'NOT_IMPLEMENTED',
          note: 'Automated SLA escalation monitoring is not implemented in the current backend. SLA thresholds configured in Global Rules are stored but not yet enforced by background processes.',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/super-admin/audit-logs
 * Platform-level audit logs (super_audit_logs table)
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = db.findAll('super_audit_logs');
    const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.status(200).json({ success: true, data: sorted });
  } catch (err) {
    next(err);
  }
};

export default {
  getOverview,
  getTenants, createTenant, getTenantById, updateTenant, updateTenantStatus, updateSubscription,
  getUsers, createUser, updateUserStatus, updateUser, resetUserPassword,
  getGlobalConfig, updateGlobalConfig,
  getDepartments, createDepartment,
  getContractors, createContractor,
  getAmcRates, updateAmcRate,
  getSystemHealth, getAuditLogs,
};
