import http from 'http';
import app from './app.js';
import inMemoryDb from './config/inMemoryDb.js';

async function testAllRoleEndpoints() {
  console.log('========================================================================');
  console.log('   🧪 COMPREHENSIVE ROLE-BASED TEST: RWA, CLERK, DEPT HEAD & CONTRACTOR  ');
  console.log('========================================================================\n');

  inMemoryDb.reset();

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
    title: 'Water Leakage in Main Pipeline',
    category: 'Water & Sanitation',
    subCategory: 'Pipe Burst',
    severity: 'High',
    description: 'Freshwater line leaking profusely at Sector 4 Junction A.',
    location: { sector: 'Sector 4', block: 'Block B', street: 'MG Road' },
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
  // Triage Queue
  const triageQueue = await req('/clerk/triage-queue', 'GET', null, clerkToken);
  report('GET /clerk/triage-queue', triageQueue.status === 200 && Array.isArray(triageQueue.data?.data), `Pending triage: ${triageQueue.data?.count}`);

  // Duplicate Check
  const dupCheck = await req(`/clerk/duplicate-check?complaintId=${cmpId}`, 'GET', null, clerkToken);
  report('GET /clerk/duplicate-check (100m Radius Check)', dupCheck.status === 200 && dupCheck.data?.data !== undefined, `Suspected: ${dupCheck.data?.data?.isDuplicateSuspected}`);

  // 1. Triage to UNDER_REVIEW
  const triageRes = await req(`/clerk/complaints/${cmpId}/triage`, 'PATCH', {}, clerkToken);
  report('PATCH /clerk/complaints/:id/triage (Start Review)', triageRes.status === 200 && triageRes.data?.data?.status === 'UNDER_REVIEW', `Status: ${triageRes.data?.data?.status}`);

  // 2. Validate to VALIDATED
  const validateRes = await req(`/clerk/complaints/${cmpId}/validate`, 'PATCH', {}, clerkToken);
  report('PATCH /clerk/complaints/:id/validate (Mark Validated)', validateRes.status === 200 && validateRes.data?.data?.status === 'VALIDATED', `Status: ${validateRes.data?.data?.status}`);

  // 3. Create Work Order with line items
  const woPayload = {
    complaintId: cmpId,
    contractorId: 'c0000000-0000-0000-0000-000000000003', // AquaFlow Utilities Corp
    priority: 'HIGH',
    lineItems: [
      { rateCardId: 'RATE-04', description: 'Pipe Repair & Fitting', qty: 2 },
    ],
    specialInstructions: 'Inspect valve seal immediately.',
  };
  const woRes = await req('/clerk/work-orders', 'POST', woPayload, clerkToken);
  const woId = woRes.data?.data?.id;
  report('POST /clerk/work-orders (Create Work Order)', woRes.status === 201 && !!woId, `WO Number: ${woRes.data?.data?.workOrderNumber}, Estimate: ₹${woRes.data?.data?.estimatedAmount}`);

  // 4. List Work Orders
  const woList = await req('/clerk/work-orders', 'GET', null, clerkToken);
  report('GET /clerk/work-orders (List All WOs)', woList.status === 200 && Array.isArray(woList.data?.data), `Total Work Orders: ${woList.data?.count}`);

  // 5. Escalate Complaint
  const escalateRes = await req(`/clerk/escalate/${cmpId}`, 'POST', { reason: 'Severe water pipeline disruption', escalateTo: 'DEPT_HEAD' }, clerkToken);
  report('POST /clerk/escalate/:id (Escalation Engine)', escalateRes.status === 200, `Status: ${escalateRes.data?.data?.status}`);

  // 5. Test RWA Verification on Completed Ticket (CMP-2026-0101 starts as PENDING_VERIFICATION)
  console.log('\n─── 5. RWA VERIFICATION & DISPUTE LIFECYCLE ────────────────────────────');
  const verifyRes = await req(`/complaints/CMP-2026-0101/verify`, 'POST', { rating: 5, remarks: 'Verified on ground.' }, rwaToken);
  report('POST /complaints/:id/verify (Citizen Confirm Fix)', verifyRes.status === 200 && verifyRes.data?.data?.status === 'CLOSED', `Status: ${verifyRes.data?.data?.status}, Rating: 5/5`);

  // 6. Test Member 4 — Department Head Governance & Staff
  console.log('\n─── 6. MEMBER 4: DEPARTMENT HEAD GOVERNANCE & STAFF ────────────────────');
  // Pending Approvals
  const approvals = await req('/dept-head/approvals', 'GET', null, headToken);
  report('GET /dept-head/approvals (Estimates Queue)', approvals.status === 200 && Array.isArray(approvals.data?.data), `Pending Approvals: ${approvals.data?.count}`);

  // Process Approval (Approve estimate)
  const approvalRes = await req(`/dept-head/approvals/e0000000-0000-0000-0000-000000000001`, 'POST', { action: 'APPROVE', notes: 'Approved for contractor dispatch.' }, headToken);
  report('POST /dept-head/approvals/:id (Authorize Estimate)', approvalRes.status === 200, `Result: ${approvalRes.data?.message}`);

  // Get Staff
  const staff = await req('/dept-head/staff', 'GET', null, headToken);
  report('GET /dept-head/staff (Employees & Contractors)', staff.status === 200 && Array.isArray(staff.data?.data), `Staff Count: ${staff.data?.count}`);

  // Create New Desk Clerk Staff Account
  const newStaffPayload = {
    name: 'Anjali Gupta',
    email: 'anjali.clerk@infralynx.com',
    username: 'anjali_clerk',
    password: 'Password@123',
    phone: '+91 98765 11223',
  };
  const createStaffRes = await req('/dept-head/staff', 'POST', newStaffPayload, headToken);
  report('POST /dept-head/staff (Create Employee Account)', createStaffRes.status === 201 && createStaffRes.data?.data?.role === 'DESK_CLERK', `Created: ${createStaffRes.data?.data?.name} (Role: ${createStaffRes.data?.data?.role})`);

  // Department Analytics
  const analytics = await req('/dept-head/analytics', 'GET', null, headToken);
  report('GET /dept-head/analytics (Dept Performance & SLAs)', analytics.status === 200, `Dept: ${analytics.data?.data?.departmentName}, Total WOs: ${analytics.data?.data?.summary?.totalTickets}`);

  // Close server
  await new Promise((resolve) => server.close(resolve));

  console.log('\n========================================================================');
  console.log(`🎉 TEST SUMMARY: ${testsPassed} PASSED / ${testsFailed} FAILED out of ${testsPassed + testsFailed} tests.`);
  console.log('========================================================================');
}

testAllRoleEndpoints();
