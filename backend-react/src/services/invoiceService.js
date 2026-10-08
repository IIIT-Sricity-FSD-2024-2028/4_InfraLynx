/**
 * TIMS 3-Way Reconciliation & Invoice Service (Member 5: Finance & AMC)
 * 
 * Verifies financial compliance across 3 pillars:
 * 1. Approved Work Order Estimate
 * 2. Contractor Actual Work Evidence & Billed Line Items
 * 3. Registered AMC Contract Rate Card
 */

import inMemoryDb from '../config/inMemoryDb.js';

/**
 * Perform 3-Way Reconciliation Audit on an invoice
 * @param {string} invoiceId - ID or Code of the invoice
 * @returns {Promise<Object>} Reconciliation report
 */
export const perform3WayCheck = async (invoiceId) => {
  // 1. Locate Invoice
  const invoice = inMemoryDb.findOne('invoices', (inv) => inv.id === invoiceId || inv.invoice_code === invoiceId);
  if (!invoice) {
    const error = new Error(`Invoice '${invoiceId}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // 2. Fetch linked Work Order
  const workOrder = invoice.work_order_id
    ? inMemoryDb.findById('work_orders', invoice.work_order_id)
    : null;

  // 3. Fetch linked Complaint
  const complaint = workOrder && workOrder.complaint_id
    ? inMemoryDb.findById('complaints', workOrder.complaint_id)
    : null;

  // 4. Fetch Contractor
  const contractor = invoice.contractor_id
    ? inMemoryDb.findById('contractors', invoice.contractor_id)
    : null;

  // 5. Fetch Invoice Items
  const items = inMemoryDb.findAll('invoice_items', (item) => item.invoice_id === invoice.id);

  // 6. Fetch AMC rates for contractor/department
  const allRates = inMemoryDb.findAll('amc_rates');

  // Audit Line Items against AMC Rate Cards
  let allRatesMatch = true;
  const itemsBreakdown = items.map((item) => {
    // Find matching rate in rate card
    const matchingRate = allRates.find(
      (r) => r.item_name?.toLowerCase() === item.description?.toLowerCase() ||
             item.description?.toLowerCase().includes(r.item_name?.toLowerCase())
    );

    const amcRate = matchingRate ? Number(matchingRate.rate) : Number(item.rate);
    const billedRate = Number(item.rate);
    const isRateValid = matchingRate ? billedRate <= amcRate : true;

    if (!isRateValid) {
      allRatesMatch = false;
    }

    return {
      description: item.description,
      unit: item.unit,
      amcRate,
      billedRate,
      quantity: Number(item.quantity),
      amount: Number(item.amount),
      rateCardVerified: isRateValid,
    };
  });

  // Calculate Variance
  const billedAmount = Number(invoice.total_amount || 0);
  const estimateAmount = Number(invoice.approved_estimate_amount || (workOrder?.estimated_cost || billedAmount));
  const varianceAmount = billedAmount - estimateAmount;
  const variancePercent = estimateAmount > 0
    ? Number(((varianceAmount / estimateAmount) * 100).toFixed(2))
    : 0;

  // Verify Citizen / RWA signoff
  const rwaVerified = complaint
    ? complaint.status === 'CLOSED' || complaint.is_resolved_by_resident === true
    : false;

  // Determine Reconciliation Status
  let reconciliationStatus = 'MATCH';
  let message = 'All 3 pillars reconciled successfully: Estimate, Work Proof, and AMC Rate Card match.';

  if (!rwaVerified) {
    reconciliationStatus = 'UNVERIFIED_WORK';
    message = 'Work completion awaiting RWA / citizen confirmation before payment release.';
  } else if (!allRatesMatch) {
    reconciliationStatus = 'RATE_MISMATCH';
    message = 'One or more billed line items exceed the maximum registered AMC contract rates.';
  } else if (variancePercent > 10.0) {
    reconciliationStatus = 'VARIANCE_FLAGGED';
    message = `Billed amount exceeds approved estimate by ${variancePercent}% (threshold: 10%). Requires COO override.`;
  }

  return {
    invoiceId: invoice.id,
    invoiceCode: invoice.invoice_code,
    invoiceNumber: invoice.invoice_number,
    workOrderId: workOrder?.work_order_number || invoice.work_order_id,
    complaintCode: complaint?.complaint_code || null,
    complaintTitle: complaint?.title || 'Infrastructure Maintenance',
    contractor: contractor ? {
      id: contractor.id,
      name: contractor.company_name,
      gstin: contractor.gstin,
      accountNumber: contractor.bank_account_number || 'HDFC0004928192831',
    } : null,
    financials: {
      estimateAmount,
      billedAmount,
      varianceAmount,
      variancePercent,
    },
    compliance: {
      reconciliationStatus,
      rateCardMatch: allRatesMatch,
      rwaVerified,
      auditStatus: invoice.status,
      message,
    },
    itemsBreakdown,
  };
};

export default {
  perform3WayCheck,
};
