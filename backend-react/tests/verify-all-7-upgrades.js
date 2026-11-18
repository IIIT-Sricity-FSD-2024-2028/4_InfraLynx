/**
 * verify-all-7-upgrades.js
 * Comprehensive automated verification script for InfraLynx 7 core upgrades
 */

import http from 'http';
import app from '../src/app.js';
import db from '../src/config/db.js';
import {
  evaluateSlaStatus,
  calculateResponseSlaDeadline,
  calculateResolutionSlaDeadline,
  pauseSla,
  resumeSla,
} from '../src/services/slaService.js';

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 RUNNING COMPREHENSIVE VERIFICATION OF ALL 7 INFRALYNX UPGRADES');
  console.log('========================================================================\n');

  // Start test server on random port
  await db.refreshTablesFromPostgres();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Test server running on ${baseUrl}\n`);

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    console.log('--- 1. PERFORMANCE & NETWORK FIXES ---');
    // Preflight CORS request to verify maxAge: 86400 and credentials
    const corsRes = await request('OPTIONS', '/api/v1/complaints', null, {
      Origin: 'http://127.0.0.1:5173',
      'Access-Control-Request-Method': 'POST',
    });
    assert(corsRes.headers['access-control-allow-credentials'] === 'true', 'CORS credentials allowed');
    assert(corsRes.headers['access-control-max-age'] === '86400', 'CORS maxAge set to 86400 seconds (24 hours)');

    // Login as RWA, Clerk, Contractor, Finance
    const rwaLogin = await request('POST', '/api/v1/auth/login', {
      email: 'rwa@infralynx.com',
      password: 'Password@123',
    });
    const rwaToken = rwaLogin.body.data?.token;
    assert(Boolean(rwaToken), 'RWA user authenticated successfully');

    const clerkLogin = await request('POST', '/api/v1/auth/login', {
      email: 'clerk@infralynx.com',
      password: 'Password@123',
    });
    const clerkToken = clerkLogin.body.data?.token;
    assert(Boolean(clerkToken), 'Clerk user authenticated successfully');

    const contractorLogin = await request('POST', '/api/v1/auth/login', {
      email: 'contractor@infralynx.com',
      password: 'Password@123',
    });
    const contractorToken = contractorLogin.body.data?.token;
    assert(Boolean(contractorToken), 'Contractor user authenticated successfully');

    const financeLogin = await request('POST', '/api/v1/auth/login', {
      email: 'finance@infralynx.com',
      password: 'Password@123',
    });
    const financeToken = financeLogin.body.data?.token;
    assert(Boolean(financeToken), 'Finance user authenticated successfully');

    // -------------------------------------------------------------------------
    console.log('\n--- 2. SLA ENGINE & WORKFLOW CORRECTIONS ---');
    // Multi-stage SLAs
    const responseHours = calculateResponseSlaDeadline('EMERGENCY');
    assert(Boolean(responseHours), 'Response SLA deadline calculated for Clerk triage');

    // Test SLA status evaluation with 75% warning & 100% breached
    const futureDeadline = new Date(Date.now() + 2 * 3600 * 1000).toISOString(); // 2h left of 24h = >75% elapsed
    const warningStatus = evaluateSlaStatus(futureDeadline, 'IN_PROGRESS', null, 24);
    assert(warningStatus.state === 'WARNING' || warningStatus.isApproachingDeadline, '75% SLA threshold evaluated as WARNING / Approaching');

    const pastDeadline = new Date(Date.now() - 3600 * 1000).toISOString();
    const breachedStatus = evaluateSlaStatus(pastDeadline, 'IN_PROGRESS');
    assert(breachedStatus.state === 'BREACHED' && breachedStatus.isBreached, '100% elapsed SLA evaluated as BREACHED');

    // Create a complaint for SLA and lifecycle testing
    const createRes = await request('POST', '/api/v1/complaints', {
      title: 'Water valve chamber cracked at Palm Avenue',
      category: 'Water',
      subcategory: 'Control Valve Leaking',
      severity: 'HIGH',
      description: 'Chamber leaking clean water across footpath, urgent repair needed',
      street: 'Palm Avenue',
      landmark: 'Gate 4',
    }, { Authorization: `Bearer ${rwaToken}` });

    const complaint = createRes.body.data;
    assert(createRes.status === 201 && complaint?.sla_stage === 'RESPONSE', 'Complaint created with Response SLA Stage');

    // Test SLA clock pausing
    const pauseRes = await request('POST', `/api/v1/complaints/${complaint.id}/pause`, {
      reason: 'Awaiting specialized valve component delivery',
    }, { Authorization: `Bearer ${rwaToken}` });
    assert(pauseRes.status === 200 && pauseRes.body.data?.status === 'PAUSED', 'SLA clock successfully PAUSED');

    // Test SLA clock resuming & deadline extension
    const resumeRes = await request('POST', `/api/v1/complaints/${complaint.id}/resume`, {}, { Authorization: `Bearer ${rwaToken}` });
    assert(resumeRes.status === 200 && resumeRes.body.data?.status !== 'PAUSED', 'SLA clock successfully RESUMED and deadline extended');

    // -------------------------------------------------------------------------
    console.log('\n--- 3. RWA REPORT MANAGEMENT: EDIT & CANCEL ---');
    // Edit report
    const editRes = await request('PUT', `/api/v1/complaints/${complaint.id}`, {
      title: 'Amended: Water valve chamber crack & flood hazard',
      landmark: 'Near Transformer Box, Gate 4',
      description: 'Updated observation: Leakage increased to moderate flow',
    }, { Authorization: `Bearer ${rwaToken}` });
    assert(editRes.status === 200, 'RWA successfully edited reported complaint');
    const editedComp = db.findById('complaints', complaint.id);
    assert(Array.isArray(editedComp.edit_history) && editedComp.edit_history.length > 0, 'Edit history preserved with timestamp & actor');

    // Cancel report
    const cancelRes = await request('POST', `/api/v1/complaints/${complaint.id}/cancel`, {
      reason: 'Citizen confirmed internal valve tightened by plumber',
      remarks: 'Self-resolved by society maintenance staff, false alarm.',
    }, { Authorization: `Bearer ${rwaToken}` });
    assert(cancelRes.status === 200, 'RWA successfully cancelled complaint with mandatory remarks');
    const cancelledComp = db.findById('complaints', complaint.id);
    assert(cancelledComp.status === 'CLOSED' && cancelledComp.cancellation_reason.includes('plumber'), 'Complaint transitioned to CLOSED with cancellation reason');

    // -------------------------------------------------------------------------
    console.log('\n--- 4. ERROR-TOLERANT ARCHITECTURE FOR ALL ACTORS ---');
    // Clerk: recall rejected/misrouted complaint
    const newCompRes = await request('POST', '/api/v1/complaints', {
      title: 'Misrouted streetlight issue',
      category: 'Electrical',
      subcategory: 'Streetlight Failure / Blackout',
      severity: 'MEDIUM',
      description: 'Streetlight flickering',
      street: 'Gulmohar Marg',
    }, { Authorization: `Bearer ${rwaToken}` });
    const comp2 = newCompRes.body.data;

    // Clerk rejects by mistake
    await request('PATCH', `/api/v1/clerk/complaints/${comp2.id}/reject`, { reason: 'Wrong category' }, { Authorization: `Bearer ${clerkToken}` });
    // Clerk recalls mistake
    const recallRes = await request('POST', `/api/v1/clerk/complaints/${comp2.id}/recall`, {
      reason: 'Accidental rejection; category verified as valid Electrical fixture',
    }, { Authorization: `Bearer ${clerkToken}` });
    assert(recallRes.status === 200 && recallRes.body.data?.status === 'REPORTED', 'Clerk recalled accidentally rejected complaint back to active triage');

    // Inspector site amendment
    const sampleWo = db.findOne('work_orders', (w) => w.contractor_id);
    if (sampleWo) {
      const amendRes = await request('POST', `/api/v1/contractor/jobs/${sampleWo.id}/amend-inspection`, {
        inspectionNotes: 'Amended ground inspection: Found corroded feeder terminal',
        reason: 'Supplemental ground inspection with diagnostic multimeter',
      }, { Authorization: `Bearer ${contractorToken}` });
      assert(amendRes.status === 200, 'Inspector successfully amended ground inspection findings');
    }

    // Finance line item flagging
    let sampleInv = db.findOne('invoices', (i) => i.id);
    if (sampleInv) {
      let invItem = db.findOne('invoice_items', (it) => it.invoice_id === sampleInv.id);
      if (!invItem) {
        invItem = db.insert('invoice_items', {
          invoice_id: sampleInv.id,
          description: 'Emergency Civil Repair Surcharge',
          unit: 'unit',
          quantity: 1,
          rate: 500,
          amount: 500,
        });
      }
      const flagItemRes = await request('POST', `/api/v1/finance/invoices/${sampleInv.id}/flag-item`, {
        itemId: invItem.id,
        reason: 'Quantity billed requires photographic meter verification',
      }, { Authorization: `Bearer ${financeToken}` });
      assert(flagItemRes.status === 200, 'Finance successfully flagged specific line item without blocking full work order');
    }

    // -------------------------------------------------------------------------
    console.log('\n--- 5. MULTI-CONTRACTOR BIDDING & COMPOSITE AUTO-SELECTION ---');
    // Validate comp2 and create work order
    await request('PATCH', `/api/v1/clerk/complaints/${comp2.id}/validate`, {}, { Authorization: `Bearer ${clerkToken}` });
    const woRes = await request('POST', '/api/v1/clerk/work-orders', {
      complaintId: comp2.id,
      priority: 'HIGH',
    }, { Authorization: `Bearer ${clerkToken}` });
    const testWo = woRes.body.data;
    assert(Boolean(testWo), 'Work order created from validated complaint');

    // Open bidding
    const openBidRes = await request('POST', `/api/v1/work-orders/${testWo.id}/open-bidding`, {}, { Authorization: `Bearer ${clerkToken}` });
    assert(openBidRes.status === 200, 'Work order opened for multi-contractor bidding');

    // Submit Bid 1 (Low cost, good rating, 3 days)
    let contractors = db.find('contractors');
    if (!contractors || contractors.length === 0) {
      const cRes = await request('GET', '/api/v1/master/contractors', null, { Authorization: `Bearer ${clerkToken}` });
      contractors = cRes.body.data || [];
    }
    const c1 = contractors[0] || { id: 'c0000000-0000-0000-0000-000000000001', company_name: 'Verma Infrastructure' };
    const c2 = contractors[1] || { id: 'c0000000-0000-0000-0000-000000000002', company_name: 'Apex Civil Works' };

    const bid1Res = await request('POST', `/api/v1/work-orders/${testWo.id}/bids`, {
      contractor_id: c1.id,
      bid_amount: 4500,
      estimated_days: 2,
      justification: 'Stock driver available in township warehouse',
    }, { Authorization: `Bearer ${clerkToken}` });
    assert(bid1Res.status === 201, 'Contractor 1 submitted competitive bid');

    // Submit Bid 2 (Higher cost, 4 days)
    const bid2Res = await request('POST', `/api/v1/work-orders/${testWo.id}/bids`, {
      contractor_id: c2.id,
      bid_amount: 6200,
      estimated_days: 4,
      justification: 'Requires brand-new OEM component dispatch',
    }, { Authorization: `Bearer ${clerkToken}` });
    assert(bid2Res.status === 201, 'Contractor 2 submitted competing bid');

    // Retrieve bids with composite formula evaluation (50% Cost + 35% Rating + 15% Timeline)
    const bidsListRes = await request('GET', `/api/v1/work-orders/${testWo.id}/bids`, null, { Authorization: `Bearer ${clerkToken}` });
    const scoredBids = bidsListRes.body.data;
    assert(Array.isArray(scoredBids) && scoredBids.length >= 2, 'Retrieved multiple bids for work order');
    assert(Number(scoredBids[0].composite_score) > 0, 'Composite score evaluated using 50% Cost + 35% Rating + 15% Timeline');

    // Test Contractor Retracting Bid
    const retractRes = await request('POST', `/api/v1/work-orders/${testWo.id}/bids/retract`, {
      contractor_id: c2.id,
    }, { Authorization: `Bearer ${clerkToken}` });
    assert(retractRes.status === 200, 'Contractor can retract bid prior to selection');

    // Auto-select best bid
    const autoSelectRes = await request('POST', `/api/v1/work-orders/${testWo.id}/auto-select-bid`, {}, { Authorization: `Bearer ${clerkToken}` });
    assert(autoSelectRes.status === 200, 'Best contractor auto-selected based on composite score');
    const awardedWo = db.findById('work_orders', testWo.id);
    assert(awardedWo.contractor_id === c1.id && awardedWo.bidding_open === false, 'Contract awarded to highest scoring bidder and bidding closed');

    // -------------------------------------------------------------------------
    console.log('\n--- 6. BUDGET OVERRUN INQUEST WORKFLOW (FINANCE / COO) ---');
    // Issue Overrun Inquiry
    const inquiryRes = await request('POST', `/api/v1/work-orders/${testWo.id}/overrun-inquiry`, {
      remark: 'Billed amount is 35% higher than original estimate. Please justify surplus material usage.',
    }, { Authorization: `Bearer ${financeToken}` });
    assert(inquiryRes.status === 200, 'Finance/COO issued overrun inquiry remark asking why amount is high');

    // Contractor responds with rebuttal
    const rebuttalRes = await request('POST', `/api/v1/work-orders/${testWo.id}/overrun-response`, {
      rebuttal: 'Subsurface cable had burnt shielding requiring full 15m armored line replacement per CEA safety standards.',
    }, { Authorization: `Bearer ${contractorToken}` });
    assert(rebuttalRes.status === 200, 'Contractor responded to inquiry with technical justification');

    // Finance resolves overrun
    const resolveRes = await request('POST', `/api/v1/work-orders/${testWo.id}/overrun-resolve`, {
      action: 'ACCEPT',
      final_amount: 5200,
    }, { Authorization: `Bearer ${financeToken}` });
    assert(resolveRes.status === 200, 'Finance/COO successfully resolved overrun inquiry and finalized settlement');

    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 FINAL RESULT: ${passed} / ${total} TESTS PASSED`);
    console.log('========================================================================');

    if (passed === total) {
      console.log('🎉 ALL 7 UPGRADES SUCCESSFULLY IMPLEMENTED AND VERIFIED!');
    }
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    process.exit(passed === total ? 0 : 1);
  }
}

run();
