import http from 'http';
import app from './app.js';
import db from './config/db.js';
import { getApprovalThresholds } from './services/approvalService.js';
import { getSlaHours } from './services/slaService.js';

async function testAllRoleEndpoints() {
  console.log('========================================================================');
  console.log('   🧪 COMPREHENSIVE ROLE-BASED TEST: RWA, CLERK, DEPT HEAD & CONTRACTOR  ');
  console.log('========================================================================\n');

  await db.reset();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let testsPassed = 0;
  let testsFailed = 0;

  function report(name, success, info = '') {
    if (success) {
      testsPassed++;
      console.log(`✔ PASS | ${name}${info ? ` -> ${info}` : ''}`);
    } else {
      testsFailed++;
      console.log(`❌ FAIL | ${name}${info ? ` -> ${info}` : ''}`);
    }
  }

  async function req(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  // 1. Authenticate Actors & Get JWT Tokens
  console.log('─── 1. AUTHENTICATING ALL ACTORS ───────────────────────────────────────');
  const rwaLogin = await req('/auth/login', 'POST', { email: 'rwa@infralynx.com', password: 'Password@123' });
  const rwaToken = rwaLogin.data?.data?.token;
  report('RWA Login', rwaLogin.status === 200 && !!rwaToken, `Role: ${rwaLogin.data?.data?.user?.role}`);

  const clerkLogin = await req('/auth/login', 'POST', { email: 'clerk@infralynx.com', password: 'Password@123' });
  const clerkToken = clerkLogin.data?.data?.token;
  report('Desk Clerk Login', clerkLogin.status === 200 && !!clerkToken, `Role: ${clerkLogin.data?.data?.user?.role}`);

  const headLogin = await req('/auth/login', 'POST', { email: 'head@infralynx.com', password: 'Password@123' });
  const headToken = headLogin.data?.data?.token;
  report('Dept Head Login', headLogin.status === 200 && !!headToken, `Role: ${headLogin.data?.data?.user?.role}`);

  const contractorLogin = await req('/auth/login', 'POST', { email: 'contractor@infralynx.com', password: 'Password@123' });
  const contractorToken = contractorLogin.data?.data?.token;
  report('Contractor Login', contractorLogin.status === 200 && !!contractorToken, `Role: ${contractorLogin.data?.data?.user?.role}`);

  const financeLogin = await req('/auth/login', 'POST', { email: 'finance@infralynx.com', password: 'Password@123' });
  const financeToken = financeLogin.data?.data?.token;
  report('Finance Clerk Login', financeLogin.status === 200 && !!financeToken, `Role: ${financeLogin.data?.data?.user?.role}`);

  const cooLogin = await req('/auth/login', 'POST', { email: 'coo@infralynx.com', password: 'Password@123' });
  const cooToken = cooLogin.data?.data?.token;
  report('Township COO Login', cooLogin.status === 200 && !!cooToken, `Role: ${cooLogin.data?.data?.user?.role}`);

  const superAdminLogin = await req('/auth/login', 'POST', { email: 'superadmin@infralynx.com', password: 'Password@123' });
  const superAdminToken = superAdminLogin.data?.data?.token;
  report('Platform Super Admin Login', superAdminLogin.status === 200 && !!superAdminToken, `Role: ${superAdminLogin.data?.data?.user?.role}`);

  console.log('\n─── SUPER ADMIN SECURITY & CONFIGURATION REGRESSIONS ───────────────────');
  const deniedOverview = await req('/super-admin/overview', 'GET', null, rwaToken);
  report('Tenant role cannot access platform overview', deniedOverview.status === 403 && deniedOverview.data?.error?.code === 'SUPER_ADMIN_REQUIRED');

  const adminOverview = await req('/super-admin/overview', 'GET', null, superAdminToken);
  report('Super Admin overview identifies PostgreSQL storage', adminOverview.status === 200 && adminOverview.data?.data?.dbHealth?.mode === 'POSTGRESQL');

  const initialConfig = await req('/super-admin/config', 'GET', null, superAdminToken);
  const originalDeptThreshold = initialConfig.data?.data?.find((item) => item.key === 'DEPT_HEAD_APPROVAL_THRESHOLD')?.value;
  const originalEmergencySla = initialConfig.data?.data?.find((item) => item.key === 'SLA_EMERGENCY_HOURS')?.value;
  const partialConfig = await req('/super-admin/config', 'PUT', {
    updates: { DEPT_HEAD_APPROVAL_THRESHOLD: '15000', UNKNOWN_THRESHOLD: '1' },
  }, superAdminToken);
  const afterRejectedConfig = await req('/super-admin/config', 'GET', null, superAdminToken);
  report('Invalid config batch is rejected without partial changes',
    partialConfig.status === 400 && afterRejectedConfig.data?.data?.find((item) => item.key === 'DEPT_HEAD_APPROVAL_THRESHOLD')?.value === originalDeptThreshold);

  const validConfig = await req('/super-admin/config', 'PUT', {
    updates: { DEPT_HEAD_APPROVAL_THRESHOLD: '15000', SLA_EMERGENCY_HOURS: '30' }, reason: 'Integration test',
  }, superAdminToken);
  const liveConfigApplied = validConfig.status === 200 && getApprovalThresholds().CLERK_LIMIT === 15000 && getSlaHours('EMERGENCY') === 30;
  await req('/super-admin/config', 'PUT', {
    updates: { DEPT_HEAD_APPROVAL_THRESHOLD: originalDeptThreshold, SLA_EMERGENCY_HOURS: originalEmergencySla }, reason: 'Integration test cleanup',
  }, superAdminToken);
  report('Saved approval and SLA rules are applied by live workflow services', liveConfigApplied);

  const invalidTenant = await req('/super-admin/tenants', 'POST', {
    name: 'Invalid Plan Check', contact_email: 'invalid@example.com', plan_label: 'Nonexistent',
    billing_cycle: 'YEARLY', start_date: '2026-01-01', expiry_date: '2027-01-01',
  }, superAdminToken);
  report('Tenant onboarding rejects unknown subscription plan', invalidTenant.status === 400);

  const invalidContractorUser = await req('/super-admin/users', 'POST', {
    name: 'Unassigned Contractor', email: 'unassigned@example.com', username: 'unassigned-contractor',
    password: 'Temporary123!', role: 'FIELD_CONTRACTOR', township_id: 'b0000000-0000-0000-0000-000000000001',
  }, superAdminToken);
  report('Contractor account requires a valid contractor assignment', invalidContractorUser.status === 400);

  const deptHeadPendingAtCoo = await req('/coo/approvals/40000000-0000-0000-0000-000000000003', 'POST', { action: 'APPROVE' }, cooToken);
  report('COO cannot bypass Department Head approval', deptHeadPendingAtCoo.status === 409);

  const suspendTenant = await req('/super-admin/tenants/b0000000-0000-0000-0000-000000000001/status', 'PATCH', {
    status: 'SUSPENDED', reason: 'Authentication regression test',
  }, superAdminToken);
  const suspendedTenantAccess = await req('/complaints', 'GET', null, rwaToken);
  const reactivateTenant = await req('/super-admin/tenants/b0000000-0000-0000-0000-000000000001/status', 'PATCH', {
    status: 'ACTIVE', reason: 'Authentication regression test cleanup',
  }, superAdminToken);
  report('Township suspension revokes existing user tokens immediately',
    suspendTenant.status === 200 && suspendedTenantAccess.status === 403 && suspendedTenantAccess.data?.error?.code === 'TOWNSHIP_SUSPENDED' && reactivateTenant.status === 200);

  // 2. Test Master Data Routes (Shared reference data)
  console.log('\n─── 2. MASTER & CONTRACTOR REFERENCE DATA ──────────────────────────────');
  const masterContractors = await req('/master/contractors', 'GET', null, clerkToken);
  report('GET /master/contractors', masterContractors.status === 200 && masterContractors.data?.count >= 3, `Count: ${masterContractors.data?.count}`);

  const masterAmcRates = await req('/master/amc-rates', 'GET', null, contractorToken);
  report('GET /master/amc-rates', masterAmcRates.status === 200 && masterAmcRates.data?.count >= 5, `Count: ${masterAmcRates.data?.count}`);

  const masterDepts = await req('/master/departments', 'GET', null, headToken);
  report('GET /master/departments', masterDepts.status === 200 && masterDepts.data?.count >= 3, `Count: ${masterDepts.data?.count}`);

  // 3. Test Member 1 — RWA Complaint Filing & Retrieval
  console.log('\n─── 3. MEMBER 1: RWA COMPLAINT INTAKE ──────────────────────────────────');
  const newComplaintPayload = {
    title: 'High-mast Streetlight Feeder Breakdown',
    category: 'Electrical & Power',
    subcategory: 'Streetlight Failure',
    severity: 'High',
    description: 'Feeder pillar tripping frequently at Sector 54 Junction A.',
    location: { sector: 'Sector 54', block: 'Block B', street: 'Gulmohar Marg' },
  };
  const createdCmp = await req('/complaints', 'POST', newComplaintPayload, rwaToken);
  const cmpId = createdCmp.data?.data?.id;
  report('POST /complaints (File Complaint)', createdCmp.status === 201 && !!cmpId, `ID: ${cmpId}, Status: ${createdCmp.data?.data?.status}`);

  const rwaComplaints = await req('/complaints', 'GET', null, rwaToken);
  report('GET /complaints (Fetch RWA Complaints)', rwaComplaints.status === 200 && Array.isArray(rwaComplaints.data?.data), `Count: ${rwaComplaints.data?.count}`);

  const singleCmp = await req(`/complaints/${cmpId}`, 'GET', null, rwaToken);
  report(`GET /complaints/:id (Get Single Complaint)`, singleCmp.status === 200 && singleCmp.data?.data?.id === cmpId, `Title: ${singleCmp.data?.data?.title}`);

  // 4. Test Member 2 — Desk Clerk Triage, Validation, Duplicate & Work Order Lifecycle
  console.log('\n─── 4. MEMBER 2: DESK CLERK TRIAGE, VALIDATION & WORK ORDERS ───────────');
  const triageQueue = await req('/clerk/triage-queue', 'GET', null, clerkToken);
  report('GET /clerk/triage-queue', triageQueue.status === 200 && Array.isArray(triageQueue.data?.data), `Pending triage: ${triageQueue.data?.count}`);

  const dupCheck = await req(`/clerk/duplicate-check?complaintId=${cmpId}`, 'GET', null, clerkToken);
  report('GET /clerk/duplicate-check (100m Radius Check)', dupCheck.status === 200 && dupCheck.data?.data !== undefined, `Suspected: ${dupCheck.data?.data?.isDuplicateSuspected}`);

  const triageRes = await req(`/clerk/complaints/${cmpId}/triage`, 'PATCH', {}, clerkToken);
  report('PATCH /clerk/complaints/:id/triage (Start Review)', triageRes.status === 200 && triageRes.data?.data?.status === 'UNDER_REVIEW', `Status: ${triageRes.data?.data?.status}`);

  const validateRes = await req(`/clerk/complaints/${cmpId}/validate`, 'PATCH', {}, clerkToken);
  report('PATCH /clerk/complaints/:id/validate (Mark Validated)', validateRes.status === 200 && validateRes.data?.data?.status === 'VALIDATED', `Status: ${validateRes.data?.data?.status}`);

  const woPayload = {
    complaint_id: cmpId,
    complaintId: cmpId,
    contractor_id: 'c0000000-0000-0000-0000-000000000002',
    contractorId: 'c0000000-0000-0000-0000-000000000002',
    priority: 'HIGH',
    line_items: [
      { rate_card_id: 'RATE-06', description: 'Streetlight 120W LED Luminaire', qty: 2 },
    ],
    lineItems: [
      { rateCardId: 'RATE-06', description: 'Streetlight 120W LED Luminaire', qty: 2 },
    ],
    special_instructions: 'Inspect feeder pillar connections immediately.',
    specialInstructions: 'Inspect feeder pillar connections immediately.',
  };
  const woRes = await req('/clerk/work-orders', 'POST', woPayload, clerkToken);
  const woId = woRes.data?.data?.id;
  report('POST /clerk/work-orders (Create Work Order)', woRes.status === 201 && !!woId, `WO Number: ${woRes.data?.data?.workOrderNumber}, Estimate: ₹${woRes.data?.data?.estimatedAmount}`);

  const woList = await req('/clerk/work-orders', 'GET', null, clerkToken);
  report('GET /clerk/work-orders (List All WOs)', woList.status === 200 && Array.isArray(woList.data?.data), `Total Work Orders: ${woList.data?.count}`);

  const escalateRes = await req(`/clerk/escalate/${cmpId}`, 'POST', { reason: 'Severe feeder disruption', escalateTo: 'DEPT_HEAD' }, clerkToken);
  report('POST /clerk/escalate/:id (Escalation Engine)', escalateRes.status === 200, `Status: ${escalateRes.data?.data?.status}`);

  // 5. Test RWA Verification on Completed Ticket
  console.log('\n─── 5. RWA VERIFICATION & DISPUTE LIFECYCLE ────────────────────────────');
  const verifyRes = await req(`/complaints/CMP-2026-0101/verify`, 'POST', { rating: 5, remarks: 'Verified on ground.' }, rwaToken);
  report('POST /complaints/:id/verify (Citizen Confirm Fix)', verifyRes.status === 200 && verifyRes.data?.data?.status === 'CLOSED', `Status: ${verifyRes.data?.data?.status}, Rating: 5/5`);

  // 6. Test Member 4 — Department Head Governance & Staff
  console.log('\n─── 6. MEMBER 4: DEPARTMENT HEAD GOVERNANCE & STAFF ────────────────────');
  const approvals = await req('/dept-head/approvals', 'GET', null, headToken);
  report('GET /dept-head/approvals (Estimates Queue)', approvals.status === 200 && Array.isArray(approvals.data?.data), `Pending Approvals: ${approvals.data?.count}`);

  const targetApprovalId = approvals.data?.data?.[0]?.id || woId || '40000000-0000-0000-0000-000000000006';
  const approvalRes = await req(`/dept-head/approvals/${targetApprovalId}`, 'POST', { action: 'APPROVE', notes: 'Approved for contractor dispatch.' }, headToken);
  report('POST /dept-head/approvals/:id (Authorize Estimate)', approvalRes.status === 200, `Result: ${approvalRes.data?.message}`);

  const staff = await req('/dept-head/staff', 'GET', null, headToken);
  report('GET /dept-head/staff (Employees & Contractors)', staff.status === 200 && Array.isArray(staff.data?.data), `Staff Count: ${staff.data?.count}`);

  const uniqueSuffix = Date.now();
  const newStaffPayload = {
    name: 'Anjali Gupta',
    email: `anjali.clerk.${uniqueSuffix}@infralynx.com`,
    username: `anjali_clerk_${uniqueSuffix}`,
    password: 'Password@123',
    phone: '+91 98765 11223',
  };
  const createStaffRes = await req('/dept-head/staff', 'POST', newStaffPayload, headToken);
  report('POST /dept-head/staff (Create Employee Account)', createStaffRes.status === 201 && createStaffRes.data?.data?.role === 'DESK_CLERK', `Created: ${createStaffRes.data?.data?.name} (Role: ${createStaffRes.data?.data?.role})`);

  const analytics = await req('/dept-head/analytics', 'GET', null, headToken);
  report('GET /dept-head/analytics (Dept Performance & SLAs)', analytics.status === 200, `Dept: ${analytics.data?.data?.departmentName}, Total WOs: ${analytics.data?.data?.summary?.totalTickets}`);

  // 7. Test Member 3 — Field Contractor Lifecycle
  console.log('\n─── 7. MEMBER 3: FIELD CONTRACTOR JOBS, ESTIMATES & EXECUTION ──────────');
  const contractorJobs = await req('/contractor/jobs', 'GET', null, contractorToken);
  report('GET /contractor/jobs (Assigned Work Orders)', contractorJobs.status === 200 && Array.isArray(contractorJobs.data?.data), `Assigned Jobs: ${contractorJobs.data?.count}`);

  const inspRes = await req('/contractor/inspection', 'POST', {
    complaint_id: cmpId,
    complaintId: cmpId,
    work_order_id: woId,
    workOrderId: woId,
    inspection_notes: 'Verified feeder pillar rupture at site.',
    inspectionNotes: 'Verified feeder pillar rupture at site.',
  }, contractorToken);
  report('POST /contractor/inspection (Ground Inspection)', inspRes.status === 200);

  const estimatePayload = {
    complaint_id: cmpId,
    complaintId: cmpId,
    work_order_id: woId,
    workOrderId: woId,
    line_items: [
      { item_code: 'RATE-06', quantity: 2 },
      { item_code: 'RATE-01', quantity: 3 },
    ],
    lineItems: [
      { itemCode: 'RATE-06', quantity: 2 },
      { itemCode: 'RATE-01', quantity: 3 },
    ],
  };
  const estimateRes = await req('/contractor/estimates', 'POST', estimatePayload, contractorToken);
  report('POST /contractor/estimates (AMC Rates Engine)', estimateRes.status === 201, `Estimate: ₹${estimateRes.data?.data?.estimateTotal}`);

  const targetJobId = woId;
  const statusUpdateRes = await req(`/contractor/jobs/${targetJobId}/status`, 'PATCH', {
    status: 'IN_PROGRESS',
    remarks: 'Field crew deployed.',
  }, contractorToken);
  report('PATCH /contractor/jobs/:id/status (Mark In Progress)', statusUpdateRes.status === 200);

  const evidenceRes = await req('/contractor/evidence', 'POST', {
    complaintId: cmpId,
    evidenceType: 'AFTER',
    photos: ['https://images.unsplash.com/photo-after-pipe-fix.jpg'],
    caption: 'Pipeline welded and pressure tested.',
  }, contractorToken);
  report('POST /contractor/evidence (Upload Proof)', evidenceRes.status === 201);

  // 8. Test Member 5 — Finance & AMC Reconciliation
  console.log('\n─── 8. MEMBER 5: FINANCE & AMC RECONCILIATION ───────────────────────────');
  const invoicesRes = await req('/finance/invoices', 'GET', null, financeToken);
  report('GET /finance/invoices (Pending Invoices List)', invoicesRes.status === 200 && Array.isArray(invoicesRes.data?.data), `Invoices Count: ${invoicesRes.data?.count}`);

  const unverifiedInvId = '50000000-0000-0000-0000-000000000004';
  const singleInv = invoicesRes.data?.data?.find(inv => inv.rawId !== unverifiedInvId) || invoicesRes.data?.data?.[0];
  const invoiceId = singleInv?.rawId || '50000000-0000-0000-0000-000000000001';

  const checkRes = await req(`/finance/invoices/${invoiceId}/3-way-check`, 'GET', null, financeToken);
  report('GET /finance/invoices/:id/3-way-check (3-Way Reconciliation)', checkRes.status === 200, `Result: ${checkRes.data?.data?.compliance?.reconciliationStatus}`);

  const flagRes = await req(`/finance/invoices/${invoiceId}/flag-variance`, 'POST', { reason: 'Material unit cost discrepancy reported.' }, financeToken);
  report('POST /finance/invoices/:id/flag-variance (Flag Variance)', flagRes.status === 200, `Status: ${flagRes.data?.data?.status}`);

  const unverifiedAuthRes = await req(`/finance/invoices/${unverifiedInvId}/authorize`, 'POST', {}, financeToken);
  report('POST /finance/invoices/:id/authorize (Blocked for Unverified RWA Work)', unverifiedAuthRes.status === 400 && unverifiedAuthRes.data?.error?.code === 'RWA_VERIFICATION_REQUIRED', `Rejection: ${unverifiedAuthRes.data?.error?.message}`);

  const authRes = await req(`/finance/invoices/${invoiceId}/authorize`, 'POST', { notes: 'Variance cleared, verified against rate cards.' }, financeToken);
  report('POST /finance/invoices/:id/authorize (Approve Payment for Verified Work)', authRes.status === 200, `Status: ${authRes.data?.data?.status}`);

  const payRes = await req(`/finance/invoices/${invoiceId}/pay`, 'POST', { paymentMode: 'Township Escrow RTGS', paymentReference: 'UTR-9876543210' }, financeToken);
  report('POST /finance/invoices/:id/pay (Staged Payment Release)', payRes.status === 200, `Status: ${payRes.data?.data?.invoice?.status}`);

  const rateCardsRes = await req('/finance/rate-cards', 'GET', null, financeToken);
  report('GET /finance/rate-cards (AMC Contract Master)', rateCardsRes.status === 200, `Total Items: ${rateCardsRes.data?.count}`);

  const finAnalyticsRes = await req('/finance/analytics', 'GET', null, financeToken);
  report('GET /finance/analytics (Financial Summary & Paid)', finAnalyticsRes.status === 200, `Total Billed: ₹${finAnalyticsRes.data?.data?.totalBilledAmount}`);

  // 9. Test Township COO Authority & Governance
  console.log('\n─── 9. TOWNSHIP COO: EXECUTIVE DASHBOARD & GOVERNANCE ──────────────────');
  const cooDashboardRes = await req('/coo/dashboard', 'GET', null, cooToken);
  report('GET /coo/dashboard (Township Executive Dashboard)', cooDashboardRes.status === 200 && !!cooDashboardRes.data?.data?.summary, `Depts: ${cooDashboardRes.data?.data?.summary?.totalDepartments}, Open CMPs: ${cooDashboardRes.data?.data?.summary?.openComplaints}`);

  const cooDeptsRes = await req('/coo/departments', 'GET', null, cooToken);
  report('GET /coo/departments (List Departments & Staff Count)', cooDeptsRes.status === 200 && cooDeptsRes.data?.count >= 4, `Count: ${cooDeptsRes.data?.count}`);

  const updateDeptRes = await req('/coo/departments/d0000000-0000-0000-0000-000000000004', 'PUT', {
    name: 'Horticulture & Urban Waste Management',
    description: 'Community green belts, central parks, solid waste segregation, and composting units.',
    budget: 1800000,
  }, cooToken);
  report('PUT /coo/departments/:id (Update Department)', updateDeptRes.status === 200 && updateDeptRes.data?.data?.budget === 1800000, `Updated: ${updateDeptRes.data?.data?.name}`);



  const cooHeadsRes = await req('/coo/department-heads', 'GET', null, cooToken);
  report('GET /coo/department-heads (View Department Heads)', cooHeadsRes.status === 200 && Array.isArray(cooHeadsRes.data?.data), `Heads Count: ${cooHeadsRes.data?.count}`);

  // Test: Creation rejected when department is already occupied (Civil Infrastructure)
  const occupiedCreateRes = await req('/coo/department-heads', 'POST', {
    name: 'Duplicate Head',
    email: `duplicate.civil.${Date.now()}@infralynx.gov.in`,
    password: 'Password@123',
    departmentId: 'd0000000-0000-0000-0000-000000000001',
  }, cooToken);
  report(
    'POST /coo/department-heads (Rejected when department occupied)',
    (occupiedCreateRes.status === 409 || occupiedCreateRes.status === 400) && occupiedCreateRes.data?.error?.code === 'DEPARTMENT_ALREADY_OCCUPIED',
    `Code: ${occupiedCreateRes.data?.error?.code}`
  );

  // Test: Creation succeeds for unoccupied department (Electrical)
  const newHeadEmail = `head.electrical.${Date.now()}@infralynx.gov.in`;
  const createHeadRes = await req('/coo/department-heads', 'POST', {
    name: 'Er. Vikram Mehta',
    email: newHeadEmail,
    password: 'SecurePassword@123',
    phone: '+91 98765 43210',
    departmentId: 'd0000000-0000-0000-0000-000000000002',
  }, cooToken);
  report(
    'POST /coo/department-heads (Create Head with assigned dept)',
    createHeadRes.status === 201 && !!createHeadRes.data?.data?.id,
    `Created: ${createHeadRes.data?.data?.name} (ID: ${createHeadRes.data?.data?.id})`
  );
  const newHeadId = createHeadRes.data?.data?.id;

  // Test: New Department Head can immediately log in with COO-assigned credentials
  const headLoginRes = await req('/auth/login', 'POST', {
    email: newHeadEmail,
    password: 'SecurePassword@123',
  });
  report(
    'POST /auth/login (New Department Head can authenticate)',
    headLoginRes.status === 200 && headLoginRes.data?.data?.user?.role === 'DEPARTMENT_HEAD',
    `Role: ${headLoginRes.data?.data?.user?.role}, Token issued: ${!!headLoginRes.data?.data?.token}`
  );

  // Test: New Department Head can access their dashboard without Civil-only restriction
  const newHeadToken = headLoginRes.data?.data?.token;
  const newHeadDashRes = await req('/dept-head/dashboard', 'GET', null, newHeadToken);
  report(
    'GET /dept-head/dashboard (Non-Civil Head accesses dashboard without error)',
    newHeadDashRes.status === 200 && newHeadDashRes.data?.data?.departmentName === 'Electrical & Power Distribution',
    `Dept: ${newHeadDashRes.data?.data?.departmentName}`
  );

  // Test: Unassign Department Head to vacate department
  if (newHeadId) {
    const unassignRes = await req(`/coo/department-heads/${newHeadId}/unassign`, 'POST', {}, cooToken);
    report(
      'POST /coo/department-heads/:id/unassign (Vacate Department)',
      unassignRes.status === 200 && unassignRes.data?.data?.departmentId === null,
      `Unassigned successfully, departmentId is now null`
    );
  }

  const deptStaffRes = await req(`/coo/departments/d0000000-0000-0000-0000-000000000002/staff`, 'GET', null, cooToken);
  report('GET /coo/departments/:id/staff (View Dept Staff)', deptStaffRes.status === 200 && Array.isArray(deptStaffRes.data?.data), `Staff: ${deptStaffRes.data?.count}`);

  const cooWorkOrdersRes = await req('/coo/work-orders', 'GET', null, cooToken);
  report('GET /coo/work-orders (Cross-Dept Work Orders)', cooWorkOrdersRes.status === 200 && Array.isArray(cooWorkOrdersRes.data?.data), `Total WOs: ${cooWorkOrdersRes.data?.count}`);

  const singleWoId = cooWorkOrdersRes.data?.data?.[0]?.id || '40000000-0000-0000-0000-000000000001';
  const woDetailsRes = await req(`/coo/work-orders/${singleWoId}`, 'GET', null, cooToken);
  report('GET /coo/work-orders/:id (Deep Inspection Dossier)', woDetailsRes.status === 200 && !!woDetailsRes.data?.data?.workOrderNumber, `WO: ${woDetailsRes.data?.data?.workOrderNumber}`);

  const escalateWoRes = await req(`/coo/work-orders/${singleWoId}/escalate`, 'POST', { remarks: 'COO Direct Remediation Mandate', targetPriority: 'EMERGENCY' }, cooToken);
  report('POST /coo/work-orders/:id/escalate (Escalate Work Order)', escalateWoRes.status === 200, `Status: ${escalateWoRes.data?.data?.status}`);

  const cooApprovalsRes = await req('/coo/approvals', 'GET', null, cooToken);
  report('GET /coo/approvals (Executive Approvals Board)', cooApprovalsRes.status === 200 && Array.isArray(cooApprovalsRes.data?.data), `Pending: ${cooApprovalsRes.data?.count}`);

  const decisionRes = await req(`/coo/approvals/${singleWoId}`, 'POST', { action: 'APPROVE', remarks: 'Capital expenditure authorized by Township COO.' }, cooToken);
  report('POST /coo/approvals/:id (Process Estimate Decision)', decisionRes.status === 200, `Result: ${decisionRes.data?.data?.status}`);

  // Close server
  await new Promise((resolve) => server.close(resolve));

  console.log('\n========================================================================');
  console.log(`🎉 TEST SUMMARY: ${testsPassed} PASSED / ${testsFailed} FAILED out of ${testsPassed + testsFailed} tests.`);
  console.log('========================================================================');
}

testAllRoleEndpoints();
