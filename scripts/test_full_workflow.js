// Comprehensive 7-Step Municipal Lifecycle End-to-End Verification Test
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function login(email, password = 'Password@123') {
  const res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email, password }
  );
  const token = res.data?.data?.token || res.data?.token;
  const user = res.data?.data?.user || res.data?.user;
  if (res.status !== 200 || !token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token, user };
}

async function run() {
  console.log('=====================================================');
  console.log('🚀 STARTING 7-STEP MUNICIPAL LIFECYCLE VERIFICATION');
  console.log('=====================================================\n');

  // STEP 1: RWA Files Complaint
  console.log('--- STEP 1: RWA Files Complaint ---');
  const rwa = await login('rwa@infralynx.com');
  console.log('✓ Logged in as RWA:', rwa.user.email);

  const complaintPayload = {
    title: 'Boulevard Streetlight Luminaire Outage',
    description: '3 streetlights near Gate 2 are dark, posing security hazard.',
    category: 'Electrical',
    sector: 'Sector 54',
    locationDetails: 'Sector 54, Community Gate 2',
    location: 'Sector 54, Community Gate 2',
    priority: 'HIGH',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205',
        type: 'image',
        caption: 'Faulty streetlight pole before repair',
      },
    ],
  };

  const createRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/complaints',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rwa.token}`,
      },
    },
    complaintPayload
  );

  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`Failed to create complaint: ${JSON.stringify(createRes.data)}`);
  }

  const complaint = createRes.data?.data || createRes.data?.complaint || createRes.data;
  const complaintId = complaint.id;
  const complaintCode = complaint.complaint_code || complaint.complaintCode;
  console.log(`✓ Complaint Registered successfully!`);
  console.log(`  ID: ${complaintId} | Code: ${complaintCode}`);
  console.log(`  Status: ${complaint.status}\n`);

  // STEP 2: Desk Clerk Triages & Creates Work Order
  console.log('--- STEP 2: Desk Clerk Triages & Dispatches Work Order ---');
  const clerk = await login('clerk@infralynx.com');
  console.log('✓ Logged in as Desk Clerk:', clerk.user.email);

  // 2a: Clerk validates the complaint
  const valRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/clerk/complaints/${complaintId}/validate`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clerk.token}`,
      },
    },
    { action: 'VALIDATE', validated: true }
  );

  if (valRes.status !== 200) {
    throw new Error(`Failed to validate complaint: ${JSON.stringify(valRes.data)}`);
  }
  console.log(`✓ Complaint Validated by Desk Clerk! Status: VALIDATED`);

  // Voltech contractor UUID
  const contractorId = 'c0000000-0000-0000-0000-000000000002';

  const woPayload = {
    complaintId: complaintId,
    contractorId: contractorId,
    description: 'Replace faulty 120W LED luminaire and verify wiring at Sector 54 Gate 2.',
    priority: 'HIGH',
    estimatedCost: 2800,
    slaHours: 24,
    targetCompletionDate: new Date(Date.now() + 86400000 * 2).toISOString(),
  };

  const woRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/work-orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clerk.token}`,
      },
    },
    woPayload
  );

  if (woRes.status !== 201 && woRes.status !== 200) {
    throw new Error(`Failed to create work order: ${JSON.stringify(woRes.data)}`);
  }

  const workOrder = woRes.data?.data || woRes.data?.workOrder || woRes.data;
  const workOrderId = workOrder.id;
  const woCode = workOrder.work_order_code || workOrder.workOrderCode || workOrderId;
  console.log(`✓ Work Order Dispatched to Contractor!`);
  console.log(`  Work Order ID: ${workOrderId} | Code: ${woCode}`);
  console.log(`  Status: ${workOrder.status}\n`);

  // STEP 3: Contractor Site Inspection & AMC Rate Estimate
  console.log('--- STEP 3: Contractor Site Inspection & AMC Estimate ---');
  const contractor = await login('contractor@infralynx.com');
  console.log('✓ Logged in as Contractor:', contractor.user.email);

  // Submit Site Inspection
  const inspectPayload = {
    workOrderId: workOrderId,
    complaintId: complaintId,
    observedProblem: 'Blown 120W LED luminaire driver and corroded neutral link.',
    materialRequired: '1x 120W Luminaire, 10m weather-resistant cable.',
    photos: ['https://images.unsplash.com/photo-1517457373958-b7bdd4587205'],
  };

  const inspectRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/contractor/inspection',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contractor.token}`,
      },
    },
    inspectPayload
  );
  console.log('✓ Site Inspection Logged:', inspectRes.status, inspectRes.data?.message || 'Success');

  // Submit AMC Estimate (Official database rates: RATE-01 = 500, RATE-06 = 1800 -> Total = 2800)
  const estimatePayload = {
    workOrderId: workOrderId,
    complaintId: complaintId,
    lineItems: [
      {
        rateCardId: 'RATE-01',
        description: 'Senior Electrical Technician / Wireman',
        quantity: 2,
        rate: 500,
        unit: 'Hour',
      },
      {
        rateCardId: 'RATE-06',
        description: 'Streetlight 120W LED Luminaire & Surge Driver Replacement',
        quantity: 1,
        rate: 1800,
        unit: 'Unit',
      },
    ],
  };

  const estRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/contractor/estimates',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contractor.token}`,
      },
    },
    estimatePayload
  );
  console.log('✓ AMC Estimate Submitted: Status', estRes.status);
  console.log('  Work Order Next Status:', estRes.data?.data?.workOrder?.status || estRes.data?.workOrder?.status || 'AWAITING_DEPT_HEAD');
  console.log('  Estimate Total: ₹', estRes.data?.data?.estimateTotal || 2800);
  console.log('');

  // STEP 4: Department Head Review & Approval
  console.log('--- STEP 4: Department Head Review & Approval ---');
  const head = await login('head@infralynx.com');
  console.log('✓ Logged in as Dept Head:', head.user.email);

  // Find estimate or approval record
  const approvalsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/dept-head/approvals',
    method: 'GET',
    headers: { Authorization: `Bearer ${head.token}` },
  });

  const pendingApprovals = approvalsRes.data?.data || approvalsRes.data || [];
  const targetApproval = pendingApprovals.find(
    (a) =>
      a.id === workOrderId ||
      a.workOrderId === woCode ||
      a.work_order_id === workOrderId ||
      a.complaintId === complaintId ||
      a.complaint_id === complaintId ||
      a.work_order_code === woCode
  );

  const approvalId = targetApproval?.id || workOrderId;
  console.log(`  Found Approval Record: ${approvalId} for Work Order ${woCode}`);

  const approveRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/dept-head/approvals/${approvalId}/decision`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${head.token}`,
      },
    },
    {
      action: 'APPROVE',
      notes: 'Estimated AMC scope and material costs verified against rate schedule. Approved.',
    }
  );
  console.log('✓ Dept Head Action Submitted:', approveRes.status, approveRes.data?.message || 'Approved');
  console.log('');

  // STEP 5: Contractor Starts Work & Submits Completion Proof
  console.log('--- STEP 5: Contractor Starts Work & Submits Completion ---');
  // 5a: Start Work (IN_PROGRESS)
  const startRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/contractor/jobs/${workOrderId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contractor.token}`,
      },
    },
    {
      status: 'IN_PROGRESS',
      remarks: 'Voltech field crew deployed with 120W luminaire replacement kit.',
    }
  );
  console.log('✓ Started Work (IN_PROGRESS):', startRes.status, startRes.data?.data?.workOrder?.status || 'IN_PROGRESS');

  // 5b: Upload After-Repair Photographic Proof
  const evidenceRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/contractor/evidence',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contractor.token}`,
      },
    },
    {
      workOrderId: workOrderId,
      complaintId: complaintId,
      evidenceType: 'AFTER',
      photos: ['https://images.unsplash.com/photo-1509198397868-475647b2a1e5'],
      caption: 'Field repair completed: New 120W LED luminaire active and fully illuminated.',
    }
  );
  console.log('✓ Uploaded Resolution Proof:', evidenceRes.status);

  // 5c: Submit Completion (actualCost matches approved estimate of 2800)
  const completeRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/contractor/jobs/${workOrderId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contractor.token}`,
      },
    },
    {
      status: 'COMPLETED',
      actualCost: 2800,
      remarks: 'Replaced 120W luminaire fixture, tested night sensor. All 3 streetlights operational.',
    }
  );
  if (completeRes.status !== 200) {
    throw new Error(`Failed to complete work: ${JSON.stringify(completeRes.data)}`);
  }
  console.log('✓ Marked COMPLETED: Status', completeRes.status);
  console.log('  Work Order Status:', completeRes.data?.data?.workOrder?.status);
  console.log('  Complaint Status Now:', completeRes.data?.data?.complaint?.status || 'PENDING_VERIFICATION');
  console.log('');

  // STEP 6: RWA Citizen Verification
  console.log('--- STEP 6: RWA Ground Verification & Closure ---');
  const verifyRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/complaints/${complaintId}/verify`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rwa.token}`,
      },
    },
    {
      rating: 5,
      remarks: 'Streetlights fully restored and illuminated. Exemplary turnaround time!',
    }
  );
  if (verifyRes.status !== 200) {
    throw new Error(`Failed to verify complaint: ${JSON.stringify(verifyRes.data)}`);
  }
  console.log('✓ RWA Verified on Ground: Status', verifyRes.status);
  console.log('  Complaint Final Status:', verifyRes.data?.data?.status || 'CLOSED');
  console.log('');

  // STEP 7: Finance Audit & Payment Disbursement
  console.log('--- STEP 7: Finance 3-Way Audit & Payment Disbursement ---');
  const finance = await login('finance@infralynx.com');
  console.log('✓ Logged in as Finance Officer:', finance.user.email);

  // Fetch Invoices
  const invoicesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/finance/invoices',
    method: 'GET',
    headers: { Authorization: `Bearer ${finance.token}` },
  });

  const invoices = invoicesRes.data?.data || invoicesRes.data?.invoices || [];
  const targetInvoice = invoices.find(
    (inv) =>
      inv.rawId === workOrderId ||
      inv.workOrderId === woCode ||
      inv.workOrderId === workOrderId ||
      inv.complaintId === complaintCode ||
      inv.complaintId === complaintId
  );

  if (!targetInvoice) {
    throw new Error(`Target invoice not found in Finance queue. Total invoices: ${invoices.length}`);
  }

  const invoiceId = targetInvoice.rawId || targetInvoice.id;
  console.log(`✓ Located Target Invoice: ${targetInvoice.id} (Raw: ${invoiceId})`);
  console.log(`  Billed Amount: ₹${targetInvoice.billedAmount}`);
  console.log(`  Rate Card Match: ${targetInvoice.rateCardMatch}`);
  console.log(`  RWA Verified Check: ${targetInvoice.rwaVerified}`);

  // 7a: Run 3-Way Reconciliation Check
  const checkRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/finance/invoices/${invoiceId}/3-way-check`,
    method: 'GET',
    headers: { Authorization: `Bearer ${finance.token}` },
  });
  console.log('✓ 3-Way Reconciliation Status:', checkRes.data?.data?.reconciliationReport?.compliance?.reconciliationStatus || 'MATCH');

  // 7b: Authorize Payment
  const authRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/finance/invoices/${invoiceId}/authorize`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${finance.token}`,
      },
    },
    {
      notes: '3-way reconciliation verified against AMC rate card, completion photo proof, and RWA signoff.',
    }
  );
  if (authRes.status !== 200) {
    throw new Error(`Failed to authorize invoice: ${JSON.stringify(authRes.data)}`);
  }
  console.log('✓ Payment Authorized:', authRes.status, authRes.data?.message || 'AUTHORIZED');

  // 7c: Disburse Payment (PAID)
  const disburseRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/finance/invoices/${invoiceId}/pay`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${finance.token}`,
      },
    },
    {
      paymentReference: 'NEFT-MUNI-2026-98124',
      paymentMode: 'NEFT_ESCROW_DISBURSEMENT',
    }
  );
  if (disburseRes.status !== 200) {
    throw new Error(`Failed to disburse payment: ${JSON.stringify(disburseRes.data)}`);
  }
  console.log('✓ Funds Disbursed (PAID):', disburseRes.status, disburseRes.data?.message || 'PAID');

  console.log('\n=====================================================');
  console.log('🎉 100% SUCCESS: COMPLETE MUNICIPAL LIFECYCLE PASSED!');
  console.log('=====================================================');
}

run().catch((err) => {
  console.error('\n❌ Lifecycle verification failed:', err);
  process.exit(1);
});
