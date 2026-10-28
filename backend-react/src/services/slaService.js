/**
 * slaService.js — TIMS Advanced Multi-Stage SLA Engine
 *
 * Capabilities:
 *   1. Multi-Stage SLAs:
 *      - Response SLA (Clerk triage & validation): Emergency 1h, High 4h, Medium 8h, Low 24h
 *      - Resolution SLA (Contractor repair work): Emergency 6h, High 24h, Medium 48h, Low 72h
 *   2. PAUSED State Clock Freezing:
 *      - Freezes SLA clock when placed on hold (citizen clarification, weather, material delay)
 *      - Resumes and automatically extends deadline by accumulated paused duration
 *   3. Auto-Escalation Engine:
 *      - 75% threshold flags WARNING state
 *      - 100% elapsed sets sla_status = 'BREACHED' and files escalation record for COO Dashboard
 */

import db from '../config/db.js';

export const RESPONSE_SLA_HOURS_MAP = {
  EMERGENCY: 1,
  HIGH: 4,
  MEDIUM: 8,
  LOW: 24,
};

export const RESOLUTION_SLA_HOURS_MAP = {
  EMERGENCY: 6,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
};

export const SLA_HOURS_MAP = RESOLUTION_SLA_HOURS_MAP;

/**
 * Returns response turnaround hours for clerk stage
 */
export const getResponseSlaHours = (severity = 'MEDIUM', townshipId = null) => {
  const norm = (severity || 'MEDIUM').toUpperCase();
  if (townshipId) {
    const slaRow = db.findOne('slas', (item) =>
      item.township_id === townshipId && (item.severity || '').toUpperCase() === norm
    );
    if (slaRow && slaRow.response_time_hours > 0) {
      return Number(slaRow.response_time_hours);
    }
  }
  return RESPONSE_SLA_HOURS_MAP[norm] ?? 8;
};

/**
 * Returns resolution turnaround hours for contractor stage
 */
export const getSlaHours = (severity = 'MEDIUM', townshipId = null) => {
  const norm = (severity || 'MEDIUM').toUpperCase();
  if (townshipId) {
    const slaRow = db.findOne('slas', (item) =>
      item.township_id === townshipId && (item.severity || '').toUpperCase() === norm
    );
    if (slaRow && slaRow.resolution_time_hours > 0) {
      return Number(slaRow.resolution_time_hours);
    }
  }
  const key = `SLA_${norm}_HOURS`;
  const configured = Number(db.findOne('global_config', (item) => item.key === key)?.value);
  if (Number.isSafeInteger(configured) && configured > 0) return configured;
  return RESOLUTION_SLA_HOURS_MAP[norm] ?? 48;
};

/**
 * Calculates response SLA deadline (Clerk triage)
 */
export const calculateResponseSlaDeadline = (severity, startTime = new Date(), townshipId = null) => {
  const hours = getResponseSlaHours(severity, townshipId);
  const startMs = new Date(startTime).getTime();
  return new Date(startMs + hours * 3600 * 1000).toISOString();
};

/**
 * Calculates resolution SLA deadline (Contractor completion)
 */
export const calculateSlaDeadline = (severity, startTime = new Date(), townshipId = null) => {
  const hours = getSlaHours(severity, townshipId);
  const startMs = new Date(startTime).getTime();
  return new Date(startMs + hours * 3600 * 1000).toISOString();
};

export const calculateResolutionSlaDeadline = calculateSlaDeadline;

/**
 * Evaluates current SLA health state (ON_TIME, WARNING, AT_RISK, BREACHED, PAUSED, COMPLETED).
 * Auto-flags WARNING at 75% elapsed, and BREACHED at 100% elapsed.
 */
export const evaluateSlaStatus = (slaDeadline, currentStatus, completedAt = null, totalAllocatedHours = null) => {
  const st = (currentStatus || '').toUpperCase();
  const terminalStatuses = ['CLOSED', 'VERIFIED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

  // Handle PAUSED / ON_HOLD state (Clock frozen)
  if (st === 'PAUSED' || st === 'ON_HOLD' || st === 'HOLD') {
    return {
      state: 'PAUSED',
      isPaused: true,
      hoursRemaining: 0,
      isBreached: false,
      isApproachingDeadline: false,
      isWarning: false,
      label: 'SLA Paused (Clock Frozen)',
    };
  }

  // Handle Terminal completed states
  if (terminalStatuses.includes(st)) {
    if (slaDeadline && completedAt) {
      const finishedMs = new Date(completedAt).getTime();
      const deadlineMs = new Date(slaDeadline).getTime();
      const onTime = finishedMs <= deadlineMs;
      return {
        state: onTime ? 'COMPLETED' : 'COMPLETED_LATE',
        hoursRemaining: 0,
        isBreached: !onTime,
        isApproachingDeadline: false,
        isWarning: false,
        label: onTime ? 'Completed on Time' : 'Completed (Late)',
      };
    }
    return {
      state: 'COMPLETED',
      hoursRemaining: 0,
      isBreached: false,
      isApproachingDeadline: false,
      isWarning: false,
      label: 'Completed',
    };
  }

  // Active Rework window
  if (st === 'DISPUTED' || st === 'REWORK_REQUESTED') {
    return {
      state: 'REWORK_ACTIVE',
      hoursRemaining: 24,
      isBreached: false,
      isApproachingDeadline: false,
      isWarning: false,
      label: 'Rework Window Active (24h)',
    };
  }

  if (!slaDeadline) {
    return {
      state: 'ON_TIME',
      hoursRemaining: 48,
      isBreached: false,
      isApproachingDeadline: false,
      isWarning: false,
      label: '48h remaining',
    };
  }

  const nowMs = Date.now();
  const deadlineMs = new Date(slaDeadline).getTime();
  const diffMs = deadlineMs - nowMs;
  const hoursRemaining = Math.round((diffMs / (3600 * 1000)) * 10) / 10;

  // 100% Elapsed -> BREACHED
  if (diffMs <= 0) {
    return {
      state: 'BREACHED',
      hoursRemaining: 0,
      isBreached: true,
      isApproachingDeadline: false,
      isWarning: false,
      label: 'Breached (100% SLA Elapsed)',
    };
  }

  // Calculate elapsed % if total hours available or infer from typical SLA
  const totalHours = totalAllocatedHours || (hoursRemaining > 48 ? 72 : hoursRemaining > 24 ? 48 : 24);
  const totalMs = totalHours * 3600 * 1000;
  const elapsedMs = Math.max(0, totalMs - diffMs);
  const elapsedPercent = Math.min(100, Math.round((elapsedMs / totalMs) * 100));

  // 75% elapsed warning threshold
  if (elapsedPercent >= 75 || hoursRemaining <= totalHours * 0.25) {
    return {
      state: 'WARNING',
      hoursRemaining,
      elapsedPercent,
      isBreached: false,
      isApproachingDeadline: true,
      isWarning: true,
      label: `${hoursRemaining}h remaining (Warning: 75% SLA Elapsed)`,
    };
  }

  if (hoursRemaining <= 4) {
    return {
      state: 'AT_RISK',
      hoursRemaining,
      isBreached: false,
      isApproachingDeadline: true,
      isWarning: false,
      label: `${hoursRemaining}h remaining (Urgent)`,
    };
  }

  return {
    state: 'ON_TIME',
    hoursRemaining,
    elapsedPercent,
    isBreached: false,
    isApproachingDeadline: false,
    isWarning: false,
    label: `${hoursRemaining}h remaining`,
  };
};

/**
 * Pause SLA clock for ticket (citizen clarification, weather, material hold)
 */
export const pauseSla = (table, id, reason = 'Awaiting citizen clarification', user = null) => {
  const item = db.findById(table, id);
  if (!item) return null;

  const now = new Date().toISOString();
  const prevStatus = item.status;

  const updated = db.update(table, item.id, {
    status: 'PAUSED',
    previous_status_before_pause: prevStatus,
    sla_paused_at: now,
    pause_reason: reason,
    updated_at: now,
  });

  db.logAudit({
    township_id: item.township_id,
    user_id: user?.id,
    action: 'SLA_CLOCK_PAUSED',
    entity_type: table,
    entity_id: item.id,
    old_value: JSON.stringify({ status: prevStatus, sla_deadline: item.sla_deadline }),
    new_value: JSON.stringify({ status: 'PAUSED', paused_at: now, reason }),
  });

  return updated;
};

/**
 * Resume SLA clock and extend deadline by the exact paused duration
 */
export const resumeSla = (table, id, user = null) => {
  const item = db.findById(table, id);
  if (!item) return null;

  const now = new Date().toISOString();
  let pausedDurationMs = 0;

  if (item.sla_paused_at) {
    pausedDurationMs = Date.now() - new Date(item.sla_paused_at).getTime();
  }

  const accumulatedDurationMs = Number(item.sla_paused_duration_ms || 0) + pausedDurationMs;

  let newDeadline = item.sla_deadline;
  if (item.sla_deadline && pausedDurationMs > 0) {
    const oldDeadlineMs = new Date(item.sla_deadline).getTime();
    newDeadline = new Date(oldDeadlineMs + pausedDurationMs).toISOString();
  }

  const restoredStatus = item.previous_status_before_pause || (table === 'complaints' ? 'UNDER_REVIEW' : 'ASSIGNED');

  const updated = db.update(table, item.id, {
    status: restoredStatus,
    sla_paused_at: null,
    sla_paused_duration_ms: accumulatedDurationMs,
    sla_deadline: newDeadline,
    updated_at: now,
  });

  db.logAudit({
    township_id: item.township_id,
    user_id: user?.id,
    action: 'SLA_CLOCK_RESUMED',
    entity_type: table,
    entity_id: item.id,
    old_value: JSON.stringify({ status: 'PAUSED', old_deadline: item.sla_deadline }),
    new_value: JSON.stringify({
      status: restoredStatus,
      new_deadline: newDeadline,
      pausedDurationMinutes: Math.round(pausedDurationMs / 60000),
    }),
  });

  return updated;
};

/**
 * Checks for auto-escalations and records entry for COO dashboard when breached or warned
 */
export const checkAndRecordEscalation = (item, entityType = 'complaint') => {
  if (!item || !item.sla_deadline) return null;
  const slaStatus = evaluateSlaStatus(item.sla_deadline, item.status);

  if (slaStatus.isBreached || slaStatus.isWarning) {
    const code = item.complaint_code || item.work_order_number || item.id;
    const action = slaStatus.isBreached ? 'SLA_BREACH_ESCALATED' : 'SLA_WARNING_ESCALATED';

    db.logAudit({
      township_id: item.township_id,
      action,
      entity_type: entityType,
      entity_id: item.id,
      notes: `${entityType.toUpperCase()} ${code} reached ${slaStatus.label}. Auto-escalated to COO dashboard.`,
    });

    return {
      escalated: true,
      slaStatus,
    };
  }

  return { escalated: false, slaStatus };
};

export const isOverdue = (slaDeadline) => {
  if (!slaDeadline) return false;
  return new Date(slaDeadline).getTime() < Date.now();
};

export const isApproachingDeadline = (slaDeadline, thresholdHours = 4) => {
  if (!slaDeadline) return false;
  const diffHours = (new Date(slaDeadline).getTime() - Date.now()) / (3600 * 1000);
  return diffHours > 0 && diffHours <= thresholdHours;
};

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
  RESPONSE_SLA_HOURS_MAP,
  RESOLUTION_SLA_HOURS_MAP,
  SLA_HOURS_MAP,
  getResponseSlaHours,
  getSlaHours,
  calculateResponseSlaDeadline,
  calculateResolutionSlaDeadline,
  calculateSlaDeadline,
  evaluateSlaStatus,
  pauseSla,
  resumeSla,
  checkAndRecordEscalation,
  isOverdue,
  isApproachingDeadline,
  enrichWithSla,
};
