/**
 * TIMS SLA Service (In-Memory Engine)
 * Computes SLA turnaround deadlines, tracks remaining time, and flags breach states.
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
 * @returns {{ state: string, hoursRemaining: number, isBreached: boolean }}
 */
export const evaluateSlaStatus = (slaDeadline, currentStatus) => {
  const terminalStatuses = ['CLOSED', 'VERIFIED'];
  if (terminalStatuses.includes((currentStatus || '').toUpperCase())) {
    return {
      state: 'COMPLETED',
      hoursRemaining: 0,
      isBreached: false,
    };
  }

  if (!slaDeadline) {
    return { state: 'ON_TIME', hoursRemaining: 48, isBreached: false };
  }

  const nowMs = Date.now();
  const deadlineMs = new Date(slaDeadline).getTime();
  const diffMs = deadlineMs - nowMs;
  const hoursRemaining = Math.round(diffMs / (3600 * 1000) * 10) / 10;

  if (diffMs <= 0) {
    return {
      state: 'BREACHED',
      hoursRemaining,
      isBreached: true,
    };
  }

  if (hoursRemaining <= 4) {
    return {
      state: 'AT_RISK',
      hoursRemaining,
      isBreached: false,
    };
  }

  return {
    state: 'ON_TIME',
    hoursRemaining,
    isBreached: false,
  };
};

export default {
  SLA_HOURS_MAP,
  getSlaHours,
  calculateSlaDeadline,
  evaluateSlaStatus,
};
