/**
 * test-civil-depthead.js — Comprehensive Test Suite for Civil Department Head Workflow
 *
 * Verifies all 8 user requirements:
 *   1. Civil Department Access (Server-side derivation, Civil exclusivity)
 *   2. Civil Work Orders (Filtered to Civil, required fields populated)
 *   3. Contractor Estimate Approval (Review AMC breakdown, reject with reason, resubmit, approve)
 *   4. Major Expenditure Threshold (> ₹100k requires joint Civil Dept Head + Township COO sign-off)
 *   5. Civil Employee List (Civil employees only, schema fields, role/department lockdown)
 *   6. Civil Department Dashboard (Real metrics, expenditure, recent activity, no cross-dept leakage)
 *   7. Backend Security & 403 Forbidden Enforcement (Blocks cross-department access, parameter tampering)
 */

import http from 'http';
import app from './app.js';

let BASE_URL = 'http://localhost:5000/api/v1';
let selfServer = null;

async function req(endpoint, method = 'GET', body = null, token = null) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

let passed = 0;
let failed = 0;

function report(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`\x1b[32m✔ PASS\x1b[0m | ${name}${extra ? ` -> \x1b[36m${extra}\x1b[0m` : ''}`);
  } else {
    failed++;
    console.log(`\x1b[31m❌ FAIL\x1b[0m | ${name}${extra ? ` -> \x1b[33m${extra}\x1b[0m` : ''}`);
  }
}

async function runTests() {
  selfServer = http.createServer(app);
  await new Promise((resolve) => selfServer.listen(0, resolve));
  const port = selfServer.address().port;
  BASE_URL = `http://localhost:${port}/api/v1`;

  console.log('========================================================================');
  console.log('🏛️  TIMS CIVIL DEPARTMENT HEAD COMPREHENSIVE VERIFICATION SUITE');
  console.log('========================================================================\n');

  // 1. Authentication & Identity Derivation
  console.log('─── 1. CIVIL DEPT HEAD AUTHENTICATION & IDENTITY DERIVATION ───────────');
  const loginRes = await req('/auth/login', 'POST', {
    email: 'head@infralynx.com',
    password: 'Password@123',
  });
  const headToken = loginRes.data?.data?.token;
  const user = loginRes.data?.data?.user;
  report(
    'Civil Dept Head Login',
    loginRes.status === 200 && user?.role === 'DEPARTMENT_HEAD',
    `Name: ${user?.name}, Role: ${user?.role}`
  );
  const deptId = user?.departmentId || user?.department_id;
  report(
    'Server-side Department Assignment',
    deptId === 'd0000000-0000-0000-0000-000000000001',
    `Department ID: ${deptId}`
  );

  // RWA, Clerk, Contractor, COO tokens for workflow testing
  const rwaLogin = await req('/auth/login', 'POST', { email: 'rwa@infralynx.com', password: 'Password@123' });
  const rwaToken = rwaLogin.data?.data?.token;

  const clerkLogin = await req('/auth/login', 'POST', { email: 'clerk@infralynx.com', password: 'Password@123' });
  const clerkToken = clerkLogin.data?.data?.token;

  const contractorLogin = await req('/auth/login', 'POST', { email: 'contractor@infralynx.com', password: 'Password@123' });
  const contractorToken = contractorLogin.data?.data?.token;

  const cooLogin = await req('/auth/login', 'POST', { email: 'coo@infralynx.com', password: 'Password@123' });
  const cooToken = cooLogin.data?.data?.token;

  // 2. Civil Department Dashboard Metrics
  console.log('\n─── 2. CIVIL DEPARTMENT DASHBOARD METRICS ─────────────────────────────');
  const dashRes = await req('/dept-head/dashboard', 'GET', null, headToken);
  const dashData = dashRes.data?.data;
  const summary = dashData?.summary;
  report(
    'GET /dept-head/dashboard (200 OK)',
    dashRes.status === 200 && !!summary,
    `Dept: ${dashData?.departmentName}`
  );
  report(
    'Total Civil Work Orders metric present',
    typeof summary?.totalWorkOrders === 'number',
    `Total: ${summary?.totalWorkOrders}, Open: ${summary?.openWorkOrders}, In-Progress: ${summary?.inProgressWorkOrders}`
  );
  report(
    'Pending Approvals & Overdue metrics present',
    typeof summary?.pendingApprovals === 'number' && typeof summary?.overdueWorkOrders === 'number',
    `Pending: ${summary?.pendingApprovals}, Overdue/At-Risk: ${summary?.overdueWorkOrders}`
  );
  report(
    'Civil Department Expenditure calculated',
    typeof summary?.totalExpenditure === 'number',
    `Expenditure: ₹${summary?.totalExpenditure.toLocaleString()}`
  );
  report(
    'Recent Civil Activity feed present',
    Array.isArray(dashData?.recentActivity),
    `Recent Activities: ${dashData?.recentActivity?.length}`
  );

  // 3. Civil Work Orders Filtering & Detail Fields
  console.log('\n─── 3. CIVIL WORK ORDERS LIST & ISOLATION ─────────────────────────────');
  const woRes = await req('/dept-head/work-orders', 'GET', null, headToken);
  const workOrders = woRes.data?.data || [];
  report(
    'GET /dept-head/work-orders (Returns array)',
    woRes.status === 200 && Array.isArray(workOrders),
    `Count: ${woRes.data?.count}`
  );

  const allAreCivil = workOrders.every(
    (w) => w.department_id === 'd0000000-0000-0000-0000-000000000001'
  );
  report(
    'Isolation: Work orders contain ONLY Civil department records',
    allAreCivil,
    `Checked ${workOrders.length} records; zero Water/Electrical records`
  );

  const firstWo = workOrders[0];
  const hasRequiredFields =
    firstWo &&
    firstWo.workOrderId &&
    firstWo.complaintDescription &&
    firstWo.category &&
    firstWo.location &&
    firstWo.assignedContractor &&
    firstWo.status &&
    firstWo.priority &&
    firstWo.slaStatus &&
    firstWo.creationDate;
  report(
    'Work Order contains all 8 required schema display fields',
    !!hasRequiredFields,
    `WO: ${firstWo?.workOrderId}, Loc: ${firstWo?.location}, Priority: ${firstWo?.priority}, SLA: ${firstWo?.slaStatus}`
  );

  // 4. Civil Employee List & Access Control
  console.log('\n─── 4. CIVIL EMPLOYEE LIST & GOVERNANCE ───────────────────────────────');
  const staffRes = await req('/dept-head/staff', 'GET', null, headToken);
  const staff = staffRes.data?.data || [];
  report(
    'GET /dept-head/staff (Returns employees)',
    staffRes.status === 200 && Array.isArray(staff),
    `Civil Staff Count: ${staffRes.data?.count}`
  );

  const allStaffCivil = staff.every(
    (s) => s.departmentId === 'd0000000-0000-0000-0000-000000000001'
  );
  report(
    'Isolation: Staff list contains ONLY Civil department employees',
    allStaffCivil,
    `Zero Water/Electrical employees visible`
  );

  const firstStaff = staff[0];
  const hasStaffFields =
    firstStaff &&
    firstStaff.name &&
    firstStaff.id &&
    firstStaff.designation &&
    firstStaff.department &&
    firstStaff.status;
  report(
    'Employee records contain Name, ID, Designation, Department, Account Status',
    !!hasStaffFields,
    `Name: ${firstStaff?.name}, ID: ${firstStaff?.id.slice(0, 8)}, Role: ${firstStaff?.role}, Dept: ${firstStaff?.department}`
  );

  // Test creating new Desk Clerk locked to Civil Department
  const uniqueEmail = `civil.clerk.${Date.now()}@infralynx.com`;
  const createStaffRes = await req(
    '/dept-head/staff',
    'POST',
    {
      name: 'Rohan Deshmukh',
      email: uniqueEmail,
      username: `rohan_${Date.now().toString().slice(-4)}`,
      password: 'Password@123',
      phone: '+91 98111 22334',
    },
    headToken
  );
  report(
    'POST /dept-head/staff (Create Employee Locked to DESK_CLERK & Civil Dept)',
    createStaffRes.status === 201 &&
      createStaffRes.data?.data?.role === 'DESK_CLERK' &&
      createStaffRes.data?.data?.departmentId === 'd0000000-0000-0000-0000-000000000001',
    `Created: ${createStaffRes.data?.data?.name}, Role: ${createStaffRes.data?.data?.role}`
  );

  const createdStaffId = createStaffRes.data?.data?.id;

  // Toggle account status (ACTIVE -> SUSPENDED)
  const suspendRes = await req(
    `/dept-head/staff/${createdStaffId}/status`,
    'PATCH',
    { status: 'SUSPENDED' },
    headToken
  );
  report(
    'PATCH /dept-head/staff/:id/status (Suspend Employee)',
    suspendRes.status === 200 && suspendRes.data?.data?.status === 'SUSPENDED',
    `Status updated to: ${suspendRes.data?.data?.status}`
  );

  // 5. Backend Security: 403 Forbidden Cross-Department Tampering Checks
  console.log('\n─── 5. BACKEND SECURITY: 403 FORBIDDEN ENFORCEMENT ─────────────────────');
  // Attempt to access Electrical Work Order (40000000-0000-0000-0000-000000000001)
  const crossWoRes = await req(
    '/dept-head/work-orders/40000000-0000-0000-0000-000000000001',
    'GET',
    null,
    headToken
  );
  report(
    'Security 403: Block cross-department GET /dept-head/work-orders/:id',
    crossWoRes.status === 403,
    `Status: ${crossWoRes.status} Forbidden (Electrical WO blocked)`
  );

  // Attempt to escalate Electrical Work Order
  const crossEscalateRes = await req(
    '/dept-head/work-orders/40000000-0000-0000-0000-000000000001/escalate',
    'POST',
    { reason: 'Unauthorized cross-dept escalation attempt' },
    headToken
  );
  report(
    'Security 403: Block cross-department POST /dept-head/work-orders/:id/escalate',
    crossEscalateRes.status === 403,
    `Status: ${crossEscalateRes.status} Forbidden`
  );

  // Attempt to approve Electrical estimate
  const crossApprovalRes = await req(
    '/dept-head/approvals/40000000-0000-0000-0000-000000000001',
    'POST',
    { action: 'APPROVE', notes: 'Tampering attempt' },
    headToken
  );
  report(
    'Security 403: Block cross-department POST /dept-head/approvals/:id',
    crossApprovalRes.status === 403,
    `Status: ${crossApprovalRes.status} Forbidden`
  );

  // Attempt to modify Electrical employee (Pooja Verma - 10000000-0000-0000-0000-000000000002)
  const crossStaffRes = await req(
    '/dept-head/staff/10000000-0000-0000-0000-000000000002',
    'PATCH',
    { name: 'Tampered Name' },
    headToken
  );
  report(
    'Security 403: Block modifying employee in another department',
    crossStaffRes.status === 403,
    `Status: ${crossStaffRes.status} Forbidden`
  );

  // Attempt to suspend Electrical employee
  const crossStaffStatusRes = await req(
    '/dept-head/staff/10000000-0000-0000-0000-000000000002/status',
    'PATCH',
    { status: 'SUSPENDED' },
    headToken
  );
  report(
    'Security 403: Block suspending employee in another department',
    crossStaffStatusRes.status === 403,
    `Status: ${crossStaffStatusRes.status} Forbidden`
  );

  // 6. Complete Civil Workflow: Desk Clerk -> Contractor -> Dept Head Rejection & Resubmission
  console.log('\n─── 6. WORKFLOW: DESK CLERK -> CONTRACTOR -> DEPT HEAD REJECT & RESUBMIT ──');
  // 6a. Desk Clerk validates a Civil complaint and creates a Civil work order
  const newCivilComplaint = await req(
    '/complaints',
    'POST',
    {
      category: 'Civil',
      title: 'Cracked Stormwater Chamber Slab on Ring Road',
      description: 'Heavy vehicle impact damaged 600mm RCC slab on storm drain.',
      severity: 'HIGH',
      sector: 'Sector 54',
      block: 'Block A',
      street: 'Arterial Ring Road',
    },
    rwaToken
  );
  const newCmpId = newCivilComplaint.data?.data?.id;

  // Step 1a: Desk Clerk validates the complaint
  const validateCmpRes = await req(
    `/clerk/complaints/${newCmpId}/validate`,
    'PATCH',
    { action: 'VALIDATE' },
    clerkToken
  );

  // Step 1b: Desk Clerk creates the Civil Work Order
  const createCivilWoRes = await req(
    '/clerk/work-orders',
    'POST',
    {
      complaintId: newCmpId,
      contractorId: 'c0000000-0000-0000-0000-000000000001', // L&T Urban Infra (Civil contractor)
      priority: 'HIGH',
      specialInstructions: 'Inspect structural load capacity and replace chamber cover.',
    },
    clerkToken
  );
  const newWoId = createCivilWoRes.data?.data?.id;
  report(
    'Step 1: Desk Clerk validates complaint and creates Civil Work Order',
    createCivilWoRes.status === 201 && !!newWoId,
    `WO ID: ${createCivilWoRes.data?.data?.workOrderNumber}`
  );

  // 6b. Contractor inspects site
  const inspectRes = await req(
    '/contractor/inspection',
    'POST',
    {
      workOrderId: newWoId,
      inspectionNotes: 'Site inspected. Severe fracture across 600mm RCC chamber lid.',
      severityConfirmed: 'HIGH',
    },
    contractorToken
  );
  report(
    'Step 2: Contractor submits ground site inspection',
    inspectRes.status === 200,
    'Inspection findings recorded'
  );

  // 6c. Contractor prepares and submits estimate using AMC rates (RATE-08 RCC Manhole Cover @ ₹3,200 x 4 = ₹12,800)
  const submitEstimateRes = await req(
    '/contractor/estimates',
    'POST',
    {
      workOrderId: newWoId,
      lineItems: [
        { rateCardId: 'RATE-08', description: 'Pre-Cast RCC Manhole Chamber Cover', qty: 4 },
      ],
    },
    contractorToken
  );
  report(
    'Step 3: Contractor submits estimate using AMC rate card',
    submitEstimateRes.status === 201 && submitEstimateRes.data?.data?.requiresDeptHeadApproval === true,
    `Estimate Total: ₹${submitEstimateRes.data?.data?.estimateTotal} (Status: ${submitEstimateRes.data?.data?.workOrder?.status})`
  );

  // 6d. Estimate automatically appears in Civil Dept Head's Pending Approvals
  const pendingApprovalsRes = await req('/dept-head/approvals', 'GET', null, headToken);
  const pendingList = pendingApprovalsRes.data?.data || [];
  const foundInQueue = pendingList.find((item) => item.id === newWoId || item.complaintId === newCmpId);
  report(
    'Step 4: Estimate automatically appears in Civil Dept Head Pending Approvals',
    !!foundInQueue,
    `Found WO: ${foundInQueue?.workOrderCode}, Amount: ₹${foundInQueue?.estimateAmount}`
  );

  // 6e. Civil Dept Head reviews details (AMC items, rate, quantity, cost)
  const detailsRes = await req(`/dept-head/approvals/${newWoId}`, 'GET', null, headToken);
  const detailData = detailsRes.data?.data;
  report(
    'Step 5: Dept Head reviews contractor and AMC line items',
    detailsRes.status === 200 && Array.isArray(detailData?.lineItems) && detailData?.lineItems.length > 0,
    `Contractor: ${detailData?.contractor?.company_name}, AMC Items: ${detailData?.lineItems?.length}`
  );

  // 6f. Rejection without reason fails validation
  const rejectWithoutReason = await req(
    `/dept-head/approvals/${newWoId}`,
    'POST',
    { action: 'REJECT' },
    headToken
  );
  report(
    'Validation: Rejection requires mandatory reason',
    rejectWithoutReason.status === 400,
    `Status 400: ${rejectWithoutReason.data?.error?.message}`
  );

  // 6g. Dept Head rejects estimate with reason
  const rejectRes = await req(
    `/dept-head/approvals/${newWoId}`,
    'POST',
    {
      action: 'REJECT',
      notes: 'Chamber size mismatch. Please re-verify dimensions with on-site caliper before replacement.',
    },
    headToken
  );
  report(
    'Step 6: Dept Head rejects estimate with captured reason',
    rejectRes.status === 200 && rejectRes.data?.data?.workOrder?.status === 'REJECTED',
    `Status: REJECTED, Reason: "${rejectRes.data?.data?.workOrder?.rejection_notes}"`
  );

  // 6h. Rejected estimate is blocked from proceeding
  const checkRejectedWo = await req(`/dept-head/work-orders/${newWoId}`, 'GET', null, headToken);
  report(
    'Validation: Rejected estimate is NOT treated as approved (Work cannot proceed)',
    checkRejectedWo.data?.data?.workOrder?.status === 'REJECTED',
    `Status remains: ${checkRejectedWo.data?.data?.workOrder?.status}`
  );

  // 6i. Contractor corrects and resubmits estimate
  const resubmitRes = await req(
    '/contractor/estimates',
    'POST',
    {
      workOrderId: newWoId,
      lineItems: [
        { rateCardId: 'RATE-08', description: 'Pre-Cast RCC Manhole Chamber Cover (600mm Circular)', qty: 2 },
        { rateCardId: 'RATE-05', description: 'Bitumen Cold-Mix Asphalt Pothole Repair', qty: 5 },
      ],
    },
    contractorToken
  );
  report(
    'Step 7: Contractor corrects and resubmits estimate',
    resubmitRes.status === 201 && resubmitRes.data?.data?.workOrder?.status === 'AWAITING_DEPT_HEAD',
    `Status reset to: ${resubmitRes.data?.data?.workOrder?.status}, New Total: ₹${resubmitRes.data?.data?.estimateTotal}`
  );

  // 6j. Dept Head approves corrected estimate
  const approveRes = await req(
    `/dept-head/approvals/${newWoId}`,
    'POST',
    {
      action: 'APPROVE',
      notes: 'Corrected dimensions verified against site report. Approved.',
    },
    headToken
  );
  report(
    'Step 8: Dept Head approves corrected estimate -> transitions to ASSIGNED for execution',
    approveRes.status === 200 && approveRes.data?.data?.workOrder?.status === 'ASSIGNED',
    `Status: ${approveRes.data?.data?.workOrder?.status}, Execution unblocked`
  );

  // 7. Major Expenditure Threshold (> ₹100,000) Joint Approval Workflow
  console.log('\n─── 7. MAJOR EXPENDITURE JOINT APPROVAL (> ₹100k THRESHOLD) ───────────');
  // Create a new Civil complaint, validate it, and create work order for major road resurfacing
  const majorComplaint = await req(
    '/complaints',
    'POST',
    {
      category: 'Civil',
      title: 'Major Arterial Spine Road Resurfacing & Reconstruction',
      description: 'Full width 100 sq.m asphalt pavement failure on main boulevard.',
      severity: 'HIGH',
      sector: 'Sector 54',
      block: 'Block A',
      street: 'Arterial Spine Road',
    },
    rwaToken
  );
  const majorCmpId = majorComplaint.data?.data?.id;

  await req(
    `/clerk/complaints/${majorCmpId}/validate`,
    'PATCH',
    { action: 'VALIDATE' },
    clerkToken
  );

  const majorWoRes = await req(
    '/clerk/work-orders',
    'POST',
    {
      complaintId: majorCmpId,
      contractorId: 'c0000000-0000-0000-0000-000000000001',
      priority: 'HIGH',
      specialInstructions: 'Arterial Spine Road Major Asphalt Reconstruction',
    },
    clerkToken
  );
  const majorWoId = majorWoRes.data?.data?.id;

  // Contractor submits estimate of ₹120,000 (100 sq.m of Cold-mix asphalt @ ₹1,200) > ₹100,000 threshold
  const majorEstimateRes = await req(
    '/contractor/estimates',
    'POST',
    {
      workOrderId: majorWoId,
      lineItems: [
        { rateCardId: 'RATE-05', description: 'Bitumen Cold-Mix Asphalt Pothole Repair', qty: 100 },
      ],
    },
    contractorToken
  );
  report(
    'Major Expenditure Estimate submitted (> ₹100,000)',
    majorEstimateRes.status === 201 && majorEstimateRes.data?.data?.estimateTotal === 120000,
    `Total: ₹${majorEstimateRes.data?.data?.estimateTotal.toLocaleString()} (> ₹100,000 Major Threshold)`
  );

  // Civil Dept Head approves major estimate -> Must NOT transition to ASSIGNED; must require COO joint sign-off
  const deptHeadMajorApproval = await req(
    `/dept-head/approvals/${majorWoId}`,
    'POST',
    {
      action: 'APPROVE',
      notes: 'Civil technical assessment confirmed. Forwarding for mandatory COO joint approval.',
    },
    headToken
  );
  const majorStatus = deptHeadMajorApproval.data?.data?.workOrder?.status;
  report(
    'Civil Dept Head approval triggers joint COO approval requirement (AWAITING_COO)',
    deptHeadMajorApproval.status === 200 && majorStatus === 'AWAITING_COO',
    `Status: ${majorStatus} (Joint sign-off preserved; work cannot proceed without COO)`
  );

  // Township COO approves major expenditure
  const cooApprovalRes = await req(
    `/coo/approvals/${majorWoId}`,
    'POST',
    {
      action: 'APPROVE',
      notes: 'Township Executive sanction granted for major road resurfacing.',
    },
    cooToken
  );
  report(
    'Township COO completes joint approval -> Transitions to ASSIGNED',
    cooApprovalRes.status === 200 && cooApprovalRes.data?.data?.status === 'ASSIGNED',
    `Final Status: ${cooApprovalRes.data?.data?.status} (Work authorized)`
  );

  console.log('\n========================================================================');
  console.log(`🎉 CIVIL DEPARTMENT HEAD TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('========================================================================');

  if (selfServer) {
    selfServer.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
