import crypto from 'crypto';

/**
 * Generates a random alphanumeric suffix of specified length
 * @param {number} length
 * @returns {string} Uppercase alphanumeric string
 */
const getRandomSuffix = (length = 4) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
};

/**
 * Current Year helper (e.g. 2026)
 */
const getCurrentYear = () => new Date().getFullYear();

/**
 * Generic business identifier generator
 * @param {string} prefix - e.g. 'CMP', 'WO', 'INV'
 * @param {number} length - Suffix length (default 4 digits)
 * @param {number|string} year - Optional year override
 * @returns {string} Formatted ID (e.g., 'CMP-2026-0814')
 */
export const generateBusinessId = (prefix = 'TIMS', length = 4, year = getCurrentYear()) => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000).toString().slice(0, length);
  return `${prefix.toUpperCase()}-${year}-${randomDigits}`;
};

/**
 * Generate Complaint Code: CMP-YYYY-XXXX (e.g. CMP-2026-0101)
 */
export const generateComplaintCode = () => {
  return generateBusinessId('CMP', 4);
};

/**
 * Generate Work Order Number: WO-YYYY-XXXX (e.g. WO-2026-0041)
 */
export const generateWorkOrderNumber = () => {
  return generateBusinessId('WO', 4);
};

/**
 * Generate Contractor Estimate Number: EST-YYYY-XXXX (e.g. EST-2026-0089)
 */
export const generateEstimateNumber = () => {
  return generateBusinessId('EST', 4);
};

/**
 * Generate Invoice Number: INV-YYYY-XXXX (e.g. INV-2026-0412)
 */
export const generateInvoiceNumber = () => {
  return generateBusinessId('INV', 4);
};

/**
 * Generate Finance Payment Voucher: VCH-YYYY-XXXX (e.g. VCH-2026-8912)
 */
export const generateVoucherNumber = () => {
  return generateBusinessId('VCH', 4);
};

/**
 * Generate AMC Contract Number: AMC-YYYY-DEPT-XXXX (e.g. AMC-2026-ELEC-001)
 * @param {string} deptCode - e.g. 'ELEC', 'CIVIL', 'WATER'
 */
export const generateAMCContractNumber = (deptCode = 'GEN') => {
  const year = getCurrentYear();
  const suffix = Math.floor(100 + Math.random() * 900);
  return `AMC-${year}-${deptCode.toUpperCase()}-${suffix}`;
};

export default {
  generateBusinessId,
  generateComplaintCode,
  generateWorkOrderNumber,
  generateEstimateNumber,
  generateInvoiceNumber,
  generateVoucherNumber,
  generateAMCContractNumber,
};
