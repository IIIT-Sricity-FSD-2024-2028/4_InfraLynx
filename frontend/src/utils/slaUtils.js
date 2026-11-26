/**
 * Unified SLA Evaluation Utility for InfraLynx
 * Correctly distinguishes terminal states (prevents false 'Breached' tags on closed/verified work),
 * handles PAUSED clocks, rework periods, and warning thresholds.
 */

export function getSlaEvaluation(deadlineIso, currentStatus, completedAt = null, totalAllocatedHours = null) {
  const st = (currentStatus || '').toUpperCase()
  const terminalStatuses = ['CLOSED', 'VERIFIED', 'COMPLETED', 'REJECTED', 'CANCELLED']

  // 1. Paused / On Hold
  if (st === 'PAUSED' || st === 'ON_HOLD' || st === 'HOLD') {
    return {
      status: 'paused',
      badgeClass: 'sla-badge-paused',
      text: 'SLA Paused (Clock Frozen)',
      isPaused: true,
      isBreached: false,
      isUrgent: false,
    }
  }

  // 2. Terminal Completed Statuses (Never flag as breached if successfully resolved)
  if (terminalStatuses.includes(st)) {
    if (deadlineIso && completedAt) {
      const finishedMs = new Date(completedAt).getTime()
      const deadlineMs = new Date(deadlineIso).getTime()
      const onTime = finishedMs <= deadlineMs
      return {
        status: onTime ? 'completed' : 'completed-late',
        badgeClass: onTime ? 'sla-badge-completed' : 'sla-badge-late',
        text: onTime ? 'Completed on Time' : 'Completed (Late)',
        isPaused: false,
        isBreached: !onTime,
        isUrgent: false,
      }
    }
    return {
      status: 'completed',
      badgeClass: 'sla-badge-completed',
      text: 'Resolved',
      isPaused: false,
      isBreached: false,
      isUrgent: false,
    }
  }

  // 3. Rework Window
  if (st === 'DISPUTED' || st === 'REWORK_REQUESTED') {
    return {
      status: 'rework',
      badgeClass: 'sla-badge-rework',
      text: 'Rework Active (24h)',
      isPaused: false,
      isBreached: false,
      isUrgent: true,
    }
  }

  // 4. Missing deadline
  if (!deadlineIso) {
    return {
      status: 'normal',
      badgeClass: 'sla-badge-normal',
      text: 'Target Active',
      isPaused: false,
      isBreached: false,
      isUrgent: false,
    }
  }

  // 5. Active SLA calculation
  const deadline = new Date(deadlineIso).getTime()
  const now = Date.now()
  const diffMs = deadline - now
  const diffHours = diffMs / (1000 * 3600)

  if (diffHours <= 0) {
    const overdueHours = Math.abs(Math.floor(diffHours))
    return {
      status: 'breached',
      badgeClass: 'sla-badge-breached',
      text: overdueHours > 0 ? `Breached (${overdueHours}h overdue)` : 'SLA Breached',
      isPaused: false,
      isBreached: true,
      isUrgent: true,
    }
  }

  const hours = Math.floor(diffHours)
  const minutes = Math.floor((diffHours - hours) * 60)
  const total = totalAllocatedHours || (hours > 48 ? 72 : hours > 24 ? 48 : 24)

  if (diffHours <= total * 0.25 || diffHours <= 4) {
    return {
      status: 'warning',
      badgeClass: 'sla-badge-warning',
      text: `${hours}h ${minutes}m left (Warning)`,
      isPaused: false,
      isBreached: false,
      isUrgent: true,
    }
  }

  if (diffHours <= 6) {
    return {
      status: 'urgent',
      badgeClass: 'sla-badge-urgent',
      text: `${hours}h ${minutes}m left (Urgent)`,
      isPaused: false,
      isBreached: false,
      isUrgent: true,
    }
  }

  return {
    status: 'normal',
    badgeClass: 'sla-badge-normal',
    text: `${hours}h ${minutes}m remaining`,
    isPaused: false,
    isBreached: false,
    isUrgent: false,
  }
}

