/**
 * slaService.js — TIMS SLA Service (In-Memory Engine)
 *
 * Computes SLA turnaround deadlines, tracks remaining time, and flags breach states.
 * Supports:
 *   - EMERGENCY: 6 hours
 *   - HIGH:      24 hours
 *   - MEDIUM:    48 hours
 *   - LOW:       72 hours
 */

export const SLA_HOURS_MAP = {
  EMERGENCY: 6,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
};

/**
 * Returns turnaround resolution hours for a given severity level.
 * @param {string} severity - EMERGENCY | HIGH | MEDIUM | LOW
 * @returns {number} Hours
 */
export const getSlaHours = (severity = 'MEDIUM') => {
  const norm = (severity || 'MEDIUM').toUpperCase();
  return SLA_HOURS_MAP[norm] ?? 48;
};

/**
 * Calculates target SLA deadline timestamp.
 * @param {string} severity - EMERGENCY | HIGH | MEDIUM | LOW
 * @param {Date|string|number} [startTime=new Date()]
 * @returns {string} ISO Date String
 */
export const calculateSlaDeadline = (severity, startTime = new Date()) => {
  const hours = getSlaHours(severity);
  const startMs = new Date(startTime).getTime();
  const deadlineMs = startMs + hours * 3600 * 1000;
  return new Date(deadlineMs).toISOString();
};

/**
 * Evaluates current SLA health state (ON_TIME, AT_RISK, BREACHED, COMPLETED).
 * @param {string} slaDeadline - Target ISO string
 * @param {string} currentStatus - Current ticket status
 * @returns {{ state: string, hoursRemaining: number, isBreached: boolean, isApproachingDeadline: boolean }}
 */
export const evaluateSlaStatus = (slaDeadline, currentStatus) => {
  const terminalStatuses = ['CLOSED', 'VERIFIED', 'COMPLETED', 'REJECTED'];
  if (terminalStatuses.includes((currentStatus || '').toUpperCase())) {
    return {
      state: 'COMPLETED',
      hoursRemaining: 0,
      isBreached: false,
      isApproachingDeadline: false,
    };
  }

  if (!slaDeadline) {
    return {
      state: 'ON_TIME',
      hoursRemaining: 48,
      isBreached: false,
      isApproachingDeadline: false,
    };
  }

  const nowMs = Date.now();
  const deadlineMs = new Date(slaDeadline).getTime();
  const diffMs = deadlineMs - nowMs;
  const hoursRemaining = Math.round((diffMs / (3600 * 1000)) * 10) / 10;

  if (diffMs <= 0) {
    return {
      state: 'BREACHED',
      hoursRemaining,
      isBreached: true,
      isApproachingDeadline: false,
    };
  }

  if (hoursRemaining <= 4) {
    return {
      state: 'AT_RISK',
      hoursRemaining,
      isBreached: false,
      isApproachingDeadline: true,
    };
  }

  return {
    state: 'ON_TIME',
    hoursRemaining,
    isBreached: false,
    isApproachingDeadline: false,
  };
};

/**
 * Checks if a deadline has already passed
 * @param {string} slaDeadline
 * @returns {boolean}
 */
export const isOverdue = (slaDeadline) => {
  if (!slaDeadline) return false;
  return new Date(slaDeadline).getTime() < Date.now();
};

/**
 * Checks if a deadline is approaching (<= threshold hours)
 * @param {string} slaDeadline
 * @param {number} thresholdHours
 * @returns {boolean}
 */
export const isApproachingDeadline = (slaDeadline, thresholdHours = 4) => {
  if (!slaDeadline) return false;
  const diffHours = (new Date(slaDeadline).getTime() - Date.now()) / (3600 * 1000);
  return diffHours > 0 && diffHours <= thresholdHours;
};

/**
 * Enriches an entity (complaint or work order) with live SLA metrics
 * @param {object} item
 * @returns {object}
 */
export const enrichWithSla = (item) => {
  if (!item) return item;
  const deadline = item.sla_deadline || item.due_at || calculateSlaDeadline(item.severity || item.priority, item.created_at);
  const status = item.status;
  const slaStatus = evaluateSlaStatus(deadline, status);

  return {
    ...item,
    sla_deadline: deadline,
    slaStatus,
  };
};

export default {
  SLA_HOURS_MAP,
  getSlaHours,
  calculateSlaDeadline,
  evaluateSlaStatus,
  isOverdue,
  isApproachingDeadline,
  enrichWithSla,
};