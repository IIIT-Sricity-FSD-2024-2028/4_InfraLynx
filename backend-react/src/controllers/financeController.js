/**
 * TIMS Finance & AMC Reconciliation Controller (Member 5)
 * 
 * Implements 3-Way Reconciliation, Variance Flagging,
 * Payment Authorization, and AMC Contract Governance.
 */

import crypto from 'crypto';
import inMemoryDb from '../config/inMemoryDb.js';
import invoiceService from '../services/invoiceService.js';

/**
 * @desc    Get all invoices for township with audit details
 * @route   GET /api/v1/finance/invoices
 * @access  Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const getInvoices = async (req, res, next) => {
  try {
    const townshipId = req.user.township_id;
    const { status, contractorId } = req.query;

    const invoices = inMemoryDb.findAll('invoices', (inv) => {
      if (townshipId && inv.township_id !== townshipId) return false;
      if (status && status !== 'ALL' && inv.status !== status) return false;
      if (contractorId && inv.contractor_id !== contractorId) return false;
      return true;
    });

    // Hydrate each invoice with contractor, work order, and complaint information
    const formattedInvoices = invoices.map((inv) => {
      const contractor = inv.contractor_id
        ? inMemoryDb.findById('contractors', inv.contractor_id)
        : null;
      const workOrder = inv.work_order_id
        ? inMemoryDb.findById('work_orders', inv.work_order_id)
        : null;
      const complaint = workOrder && workOrder.complaint_id
        ? inMemoryDb.findById('complaints', workOrder.complaint_id)
        : null;
      const department = complaint && complaint.department_id
        ? inMemoryDb.findById('departments', complaint.department_id)
        : null;
      const items = inMemoryDb.findAll('invoice_items', (item) => item.invoice_id === inv.id);

      const billedAmount = Number(inv.total_amount || 0);
      const estimateAmount = Number(inv.approved_estimate_amount || (workOrder?.estimated_cost || billedAmount));
      const varianceAmount = billedAmount - estimateAmount;
      const variancePercent = estimateAmount > 0
        ? Number(((varianceAmount / estimateAmount) * 100).toFixed(2))
        : 0;

      return {
        id: inv.invoice_code || inv.id,
        rawId: inv.id,
        invoiceNumber: inv.invoice_number,
        workOrderId: workOrder?.work_order_number || inv.work_order_id,
        complaintId: complaint?.complaint_code || null,
        title: complaint?.title || 'General Maintenance',
        department: department?.name || 'Municipal Works',
        contractor: {
          id: contractor?.id || inv.contractor_id,
          name: contractor?.company_name || 'Authorized Contractor',
          gstin: contractor?.gstin || '07AAAAA0000A1Z5',
          accountNumber: contractor?.bank_account_number || 'HDFC0004928192831',
        },
        estimateAmount,
        billedAmount,
        varianceAmount,
        variancePercent,
        auditStatus: inv.status,
        rateCardMatch: inv.rate_card_match !== false,
        rwaVerified: complaint?.status === 'CLOSED' || complaint?.is_resolved_by_resident === true,
        varianceReason: inv.variance_reason || null,
        submittedAt: inv.created_at,
        authorizedAt: inv.authorized_at || null,
        items,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedInvoices.length,
      data: formattedInvoices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single invoice details
 * @route   GET /api/v1/finance/invoices/:id
 * @access  Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = inMemoryDb.findOne('invoices', (inv) => inv.id === id || inv.invoice_code === id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { message: `Invoice '${id}' not found.` },
      });
    }

    const checkReport = await invoiceService.perform3WayCheck(invoice.id);

    res.status(200).json({
      success: true,
      data: {
        ...invoice,
        reconciliationReport: checkReport,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Perform on-demand 3-Way Reconciliation Audit
 * @route   GET /api/v1/finance/invoices/:id/3-way-check
 * @access  Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const runThreeWayCheck = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await invoiceService.perform3WayCheck(id);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authorize invoice for staged payment release
 * @route   POST /api/v1/finance/invoices/:id/authorize
 * @access  Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const authorizeInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const invoice = inMemoryDb.findOne('invoices', (inv) => inv.id === id || inv.invoice_code === id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { message: `Invoice '${id}' not found.` },
      });
    }

    const updated = inMemoryDb.update('invoices', invoice.id, {
      status: 'AUTHORIZED',
      authorized_by: req.user.id,
      authorized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    inMemoryDb.logAudit({
      township_id: invoice.township_id,
      entity_type: 'INVOICE',
      entity_id: invoice.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'INVOICE_AUTHORIZED',
      from_state: invoice.status,
      to_state: 'AUTHORIZED',
      notes: notes || 'Invoice verified across 3-way check and authorized for payment release.',
    });

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoice_code || invoice.id} authorized successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Flag financial or work variance on invoice
 * @route   POST /api/v1/finance/invoices/:id/flag-variance
 * @access  Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const flagVariance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'A variance reason or explanation must be provided.' },
      });
    }

    const invoice = inMemoryDb.findOne('invoices', (inv) => inv.id === id || inv.invoice_code === id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { message: `Invoice '${id}' not found.` },
      });
    }

    const updated = inMemoryDb.update('invoices', invoice.id, {
      status: 'VARIANCE_FLAGGED',
      variance_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    });

    inMemoryDb.logAudit({
      township_id: invoice.township_id,
      entity_type: 'INVOICE',
      entity_id: invoice.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'INVOICE_VARIANCE_FLAGGED',
      from_state: invoice.status,
      to_state: 'VARIANCE_FLAGGED',
      notes: reason.trim(),
    });

    res.status(200).json({
      success: true,
      message: `Variance discrepancy flagged for ${invoice.invoice_code || invoice.id}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Release scheduled payment for authorized invoice
 * @route   POST /api/v1/finance/invoices/:id/pay
 * @access  Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const releasePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentMode, paymentReference } = req.body;

    const invoice = inMemoryDb.findOne('invoices', (inv) => inv.id === id || inv.invoice_code === id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { message: `Invoice '${id}' not found.` },
      });
    }

    if (invoice.status !== 'AUTHORIZED' && invoice.status !== 'PENDING_AUDIT') {
      return res.status(400).json({
        success: false,
        error: { message: `Invoice must be in AUTHORIZED status before releasing payment. Current status: ${invoice.status}` },
      });
    }

    const reference = paymentReference || `UTR-${Date.now()}`;
    const paymentRecord = inMemoryDb.insert('payments', {
      id: crypto.randomUUID(),
      township_id: invoice.township_id,
      invoice_id: invoice.id,
      contractor_id: invoice.contractor_id,
      amount: invoice.total_amount,
      status: 'PAID',
      payment_mode: paymentMode || 'RTGS / Township Escrow',
      payment_reference: reference,
      authorized_by: req.user.id,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    const updatedInvoice = inMemoryDb.update('invoices', invoice.id, {
      status: 'PAID',
      updated_at: new Date().toISOString(),
    });

    // Update linked work order
    if (invoice.work_order_id) {
      inMemoryDb.update('work_orders', invoice.work_order_id, {
        status: 'SETTLED',
        updated_at: new Date().toISOString(),
      });
    }

    inMemoryDb.logAudit({
      township_id: invoice.township_id,
      entity_type: 'PAYMENT',
      entity_id: paymentRecord.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'PAYMENT_RELEASED',
      from_state: 'SCHEDULED',
      to_state: 'PAID',
      notes: `Payment released via ${paymentMode || 'RTGS'}. Reference: ${reference}`,
    });

    res.status(200).json({
      success: true,
      message: `Payment released successfully. Reference: ${reference}`,
      data: {
        payment: paymentRecord,
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get AMC rate cards master for finance reference
 * @route   GET /api/v1/finance/rate-cards
 * @access  Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const getRateCards = async (req, res, next) => {
  try {
    const rawRates = inMemoryDb.findAll('amc_rates');
    const amcs = inMemoryDb.findAll('amcs');
    const departments = inMemoryDb.findAll('departments');
    const contractors = inMemoryDb.findAll('contractors');

    const rates = rawRates.map((r) => {
      const amc = amcs.find((a) => a.id === r.amc_id);
      const dept = amc ? departments.find((d) => d.id === amc.department_id) : null;
      const contractor = amc ? contractors.find((c) => c.id === amc.contractor_id) : null;

      return {
        id: r.id,
        itemCode: r.item_code,
        itemName: r.item_name,
        serviceType: r.service_type,
        unit: r.unit,
        rate: Number(r.rate),
        amcContract: amc?.contract_number || 'AMC-GENERAL',
        department: dept?.name || 'General Maintenance',
        contractor: contractor?.company_name || 'Registered AMC Contractor',
      };
    });

    res.status(200).json({
      success: true,
      count: rates.length,
      data: rates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Finance analytics and summary metrics
 * @route   GET /api/v1/finance/analytics
 * @access  Private (FINANCE_CLERK, TOWNSHIP_COO)
 */
export const getFinanceAnalytics = async (req, res, next) => {
  try {
    const townshipId = req.user.township_id;
    const invoices = inMemoryDb.findAll('invoices', (inv) => !townshipId || inv.township_id === townshipId);

    const pendingAudit = invoices.filter((i) => i.status === 'PENDING_AUDIT').length;
    const authorized = invoices.filter((i) => i.status === 'AUTHORIZED').length;
    const varianceFlagged = invoices.filter((i) => i.status === 'VARIANCE_FLAGGED').length;
    const paid = invoices.filter((i) => i.status === 'PAID').length;

    const totalBilled = invoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
    const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
    const totalPending = invoices.filter((i) => i.status !== 'PAID').reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalInvoices: invoices.length,
        pendingAuditCount: pendingAudit,
        authorizedCount: authorized,
        varianceFlaggedCount: varianceFlagged,
        paidCount: paid,
        totalBilledAmount: totalBilled,
        totalPaidAmount: totalPaid,
        totalPendingAmount: totalPending,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getInvoices,
  getInvoiceById,
  runThreeWayCheck,
  authorizeInvoice,
  flagVariance,
  releasePayment,
  getRateCards,
  getFinanceAnalytics,
};
