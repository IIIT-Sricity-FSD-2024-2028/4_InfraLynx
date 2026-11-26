/**
 * estimateService.js — TIMS AMC Rate Card & Estimate Calculation Engine (Member 3)
 *
 * Enforces TIMS Business Rule:
 * Contractor estimates must strictly use official AMC rates.
 * The backend calculates (quantity × official_rate) and rejects or overrides arbitrary rates from the frontend.
 */

import db from '../config/db.js';
import { AppError } from '../middleware/error.js';

const normalizeRateKey = (value = '') => String(value).trim().toLowerCase();

/**
 * Calculates a verified estimate from official AMC rate cards
 * @param {Array<{ rateCardId?: string, itemCode?: string, quantity: number, description?: string }>} lineItems
 * @param {string} [contractorId] - Contractor UUID for AMC rate card resolution
 * @returns {{ lineItems: Array<object>, totalAmount: number, rateCardMatches: boolean }}
 */
export function calculateVerifiedEstimate(lineItems = [], contractorId = null) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return { lineItems: [], totalAmount: 0, rateCardMatches: true };
  }

  const activeAmcs = db.findAll('amcs', (amc) => {
    if ((amc.status || 'ACTIVE') !== 'ACTIVE') return false;
    return !contractorId || amc.contractor_id === contractorId;
  });
  if (contractorId && activeAmcs.length === 0) {
    throw new AppError('No active AMC contract exists for this contractor.', 403, 'ACTIVE_AMC_REQUIRED');
  }
  const activeAmcIds = new Set(activeAmcs.map((amc) => amc.id));
  const allRates = db.findAll('amc_rates', (rate) => {
    if ((rate.status || 'ACTIVE') !== 'ACTIVE') return false;
    return activeAmcIds.size === 0 || activeAmcIds.has(rate.amc_id);
  });

  let totalAmount = 0;
  const verifiedLineItems = [];

  for (const item of lineItems) {
    const qty = Number(item.quantity || item.qty);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 100000) {
      throw new AppError('Estimate line item quantity must be a positive number within the allowed range.', 400, 'INVALID_ESTIMATE_QUANTITY');
    }

    const rateKeys = [
      item.rateCardId,
      item.rate_card_id,
      item.amcRateId,
      item.amc_rate_id,
      item.itemCode,
      item.item_code,
      item.description,
      item.service,
    ].map(normalizeRateKey).filter(Boolean);

    // Match official AMC rate cards with fallback to township active rate cards
    let officialRate = allRates.find(
      (r) =>
        rateKeys.includes(normalizeRateKey(r.id)) ||
        rateKeys.includes(normalizeRateKey(r.item_code)) ||
        rateKeys.includes(normalizeRateKey(r.item_name))
    );

    if (!officialRate) {
      const globalRates = db.findAll('amc_rates', (rate) => (rate.status || 'ACTIVE') === 'ACTIVE');
      officialRate = globalRates.find(
        (r) =>
          rateKeys.includes(normalizeRateKey(r.id)) ||
          rateKeys.includes(normalizeRateKey(r.item_code)) ||
          rateKeys.includes(normalizeRateKey(r.item_name))
      );
    }

    if (!officialRate) {
      throw new AppError(
        `Estimate line item '${item.description || item.service || item.itemCode || item.rateCardId || 'unknown'}' is not backed by an active AMC rate card.`,
        400,
        'AMC_RATE_REQUIRED'
      );
    }

    const unitPrice = Number(officialRate.rate);
    const itemTotal = unitPrice * qty;
    totalAmount += itemTotal;

    verifiedLineItems.push({
      rateCardId: officialRate.id,
      itemCode: officialRate.item_code,
      description: officialRate.item_name,
      serviceType: officialRate.service_type || 'Labour & Materials',
      unit: officialRate.unit || 'Unit',
      officialRate: unitPrice,
      quantity: qty,
      totalAmount: itemTotal,
      isOfficialRateApplied: true,
    });
  }

  return {
    lineItems: verifiedLineItems,
    totalAmount,
    rateCardMatches: verifiedLineItems.every((i) => i.isOfficialRateApplied),
  };
}

export default {
  calculateVerifiedEstimate,
};
