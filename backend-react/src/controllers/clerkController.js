/**
 * clerkController.js — TIMS Desk Clerk Backend Controller (Member 2)
 *
 * Responsibilities:
 *   1. Fetch Complaints (Triage Queue)  — Filter by township & dept, SLA deadlines, photos & severity
 *   2. View Complaint Details           — Full asset, location, reporter, SLA, linked WO & photos
 *   3. Check & Link Duplicates          — 100-meter radius duplicate detection & master linking
 *   4. Validate Complaints              — Validate, reject with reason, or reroute department
 *   5. Fetch Eligible Contractors       — Active status, authorized for township & department, valid AMC
 *   6. Handle Escalations               — Escalate SLA delays or operational bottlenecks
 *   7. Work Order Operations            — Create, assign, track & reassign (shared with workOrderController)
 */

import db from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { findNearbyDuplicates, linkDuplicateComplaints } from '../services/duplicateService.js';
import { calculateSlaDeadline, evaluateSlaStatus, getSlaHours } from '../services/slaService.js';
import {
  createWorkOrder,
  assignContractor,
  reassignContractor,
  getWorkOrders,
  getWorkOrderById,
  formatWorkOrderResponse,
} from './workOrderController.js';

// Re-export work order operations for seamless route integration
export {
  createWorkOrder,
  assignContractor,
  reassignContractor,
  getWorkOrders,
  getWorkOrderById,
};

/**
 * Format complaint with evidence photos, reporter info, and SLA tracking
 */
function formatComplaintDetail(complaint) {
  if (!complaint) return null;

  // Retrieve evidence photos
  const allEvidence = db.find('complaint_evidence', (e) => e.complaint_id === complaint.id);
  const beforePhotos = allEvidence
    .filter((e) => e.evidence_type === 'BEFORE')
    .map((e) => e.file_url);
  const afterPhotos = allEvidence
    .filter((e) => e.evidence_type === 'AFTER')
    .map((e) => e.file_url);

  const photos = complaint.beforePhotos && complaint.beforePhotos.length > 0
    ? complaint.beforePhotos
    : (beforePhotos.length > 0 ? beforePhotos : (complaint.photos || []));

  // Retrieve reporter
  const reporter = complaint.reported_by
    ? db.findOne('users', (u) => u.id === complaint.reported_by)
    : null;

  // Retrieve department
  const department = complaint.department_id
    ? db.findOne('departments', (d) => d.id === complaint.department_id)
    : null;

  // Retrieve asset
  const asset = complaint.asset_id
    ? db.findOne('assets', (a) => a.id === complaint.asset_id)
    : null;

  // SLA calculation
  const slaDeadline = complaint.sla_deadline || calculateSlaDeadline(complaint.severity, complaint.created_at);
  const slaStatus = evaluateSlaStatus(slaDeadline, complaint.status);

  // Linked Work Order
  const linkedWo = complaint.work_order_id
    ? db.findOne('work_orders', (w) => w.id === complaint.work_order_id)
    : db.findOne('work_orders', (w) => w.complaint_id === complaint.id);

  return {
    id:               complaint.id,
    complaintCode:    complaint.complaint_code || complaint.id,
    title:            complaint.title,
    description:      complaint.description,
    category:         complaint.category,
    subcategory:      complaint.subcategory,
    severity:         complaint.severity,
    status:           complaint.status,
    townshipId:       complaint.township_id,
    departmentId:     complaint.department_id,
    departmentName:   department ? department.name : complaint.category,
    slaHours:         getSlaHours(complaint.severity),
    slaDeadline,
    slaStatus,
    location: {
      sector:          complaint.sector || complaint.location?.sector || 'Sector 54',
      block:           complaint.block || complaint.location?.block || 'Block A',
      street:          complaint.street || complaint.location?.street || '',
      locationDetails: complaint.location_details || complaint.location?.landmark || '',
      landmark:        complaint.location_details || complaint.location?.landmark || '',
      latitude:        complaint.latitude || (complaint.location?.gps ? null : 28.5355),
      longitude:       complaint.longitude || (complaint.location?.gps ? null : 77.3910),
      gps:             complaint.location?.gps || (complaint.latitude ? `${complaint.latitude}° N, ${complaint.longitude}° E` : null),
    },
    asset: asset
      ? {
          id:          asset.id,
          name:        asset.name,
          assetType:   asset.asset_type,
          sector:      asset.sector,
          block:       asset.block,
        }
      : {
          id:          complaint.asset_id || 'ASSET-GEN-01',
          name:        complaint.location?.assetName || 'General Township Asset',
          assetType:   complaint.category || 'Infrastructure',
        },
    photos,
    beforePhotos:     photos,
    afterPhotos:      complaint.afterPhotos || afterPhotos,
    reportedBy: reporter
      ? {
          id:    reporter.id,
          name:  reporter.name,
          email: reporter.email,
          phone: reporter.phone,
          role:  reporter.role,
        }
      : (typeof complaint.reported_by === 'object' ? complaint.reported_by : { name: 'RWA Representative', role: 'RWA' }),
    isDuplicate:       Boolean(complaint.is_duplicate),
    masterComplaintId: complaint.master_complaint_id || null,
    duplicateCount:    complaint.duplicate_count || 0,
    workOrderId:       linkedWo ? linkedWo.id : null,
    workOrderCode:     linkedWo ? (linkedWo.work_order_number || linkedWo.work_order_code) : null,
    workOrder:         linkedWo ? formatWorkOrderResponse(linkedWo) : null,
    history:           complaint.history || [],
    createdAt:         complaint.created_at || complaint.createdAt,
    updatedAt:         complaint.updated_at || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Fetch Complaints (Triage Queue)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Fetch pending complaints awaiting desk clerk triage & validation
 * @route  GET /api/v1/clerk/triage-queue
 * @query  ?department_id=&severity=&search=&township_id=
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const getTriageQueue = async (req, res, next) => {
  try {
    const { department_id, department, severity, search, township_id } = req.query;

    const targetTownshipId = township_id || req.user.township_id;
    const targetDeptId = department_id || (req.user.department_id ? req.user.department_id : null);

    // 1. Fetch complaints in queue (REPORTED or UNDER_REVIEW)
    let complaints = db.find('complaints', (c) => {
      const isQueueStatus = c.status === 'REPORTED' || c.status === 'UNDER_REVIEW';
      if (!isQueueStatus) return false;

      // Filter by township
      if (targetTownshipId && c.township_id && c.township_id !== targetTownshipId) {
        return false;
      }

      // Filter by department if specified
      if (targetDeptId && c.department_id && c.department_id !== targetDeptId) {
        return false;
      }

      if (department) {
        const dNorm = department.toLowerCase();
        const catNorm = (c.category || '').toLowerCase();
        if (!catNorm.includes(dNorm)) return false;
      }

      // Filter by severity
      if (severity && (c.severity || '').toUpperCase() !== severity.toUpperCase()) {
        return false;
      }

      return true;
    });

    // 2. Format complaints with photos, SLA deadlines and duplicate indicators
    const allActive = db.find('complaints', (c) => c.status !== 'CLOSED' && c.status !== 'REJECTED');

    let formatted = complaints.map((c) => {
      const detail = formatComplaintDetail(c);
      const possibleDuplicates = findNearbyDuplicates(c, allActive, 100);

      return {
        ...detail,
        hasPossibleDuplicates: possibleDuplicates.length > 0,
        duplicateMatchesCount: possibleDuplicates.length,
        topDuplicateConfidence: possibleDuplicates[0]?.confidence || null,
      };
    });

    // 3. Search query filter
    if (search) {
      const q = search.toLowerCase();
      formatted = formatted.filter((c) =>
        c.complaintCode.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.location.street || '').toLowerCase().includes(q) ||
        (c.location.block || '').toLowerCase().includes(q)
      );
    }

    // 4. Sort: EMERGENCY first, then approaching deadline, then newest
    const severityOrder = { EMERGENCY: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    formatted.sort((a, b) => {
      const sevDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
      if (sevDiff !== 0) return sevDiff;
      return new Date(a.slaDeadline) - new Date(b.slaDeadline);
    });

    // Summary counts
    const summary = {
      total: formatted.length,
      reported: formatted.filter((c) => c.status === 'REPORTED').length,
      underReview: formatted.filter((c) => c.status === 'UNDER_REVIEW').length,
      emergency: formatted.filter((c) => c.severity === 'EMERGENCY').length,
      approachingSla: formatted.filter((c) => c.slaStatus.isApproachingDeadline).length,
      breachedSla: formatted.filter((c) => c.slaStatus.isBreached).length,
    };

    res.status(200).json({
      success: true,
      count: formatted.length,
      summary,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. View Complaint Details
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   View full details of an individual complaint
 * @route  GET /api/v1/clerk/complaints/:id
 * @access Private (DESK_CLERK, TOWNSHIP_COO, DEPARTMENT_HEAD)
 */
export const getComplaintDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const complaint = db.findOne(
      'complaints',
      (c) => c.id === id || c.complaint_code === id
    );

    if (!complaint) {
      return next(new AppError(`Complaint "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const detail = formatComplaintDetail(complaint);

    // Also check for potential duplicates within 100m
    const allActive = db.find('complaints', (c) => c.status !== 'CLOSED' && c.status !== 'REJECTED');
    const duplicateMatches = findNearbyDuplicates(complaint, allActive, 100);

    res.status(200).json({
      success: true,
      data: {
        ...detail,
        duplicateMatches,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Check & Link Duplicates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Find potential duplicate active complaints within configured 100m radius
 * @route  GET /api/v1/clerk/duplicate-check
 * @query  ?complaintId=... OR ?lat=...&lng=...&category=...&sector=...
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const checkDuplicates = async (req, res, next) => {
  try {
    const { complaintId, complaint_id, lat, lng, category, sector } = req.query;

    const targetId = complaintId || complaint_id;
    let targetComplaint = null;

    if (targetId) {
      targetComplaint = db.findOne(
        'complaints',
        (c) => c.id === targetId || c.complaint_code === targetId
      );
      if (!targetComplaint) {
        return next(new AppError(`Target complaint "${targetId}" not found.`, 404, 'NOT_FOUND'));
      }
    } else if (lat && lng) {
      targetComplaint = {
        id: 'query-check',
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        category: category || '',
        sector: sector || '',
      };
    } else {
      return next(new AppError('complaintId or lat/lng query parameters are required.', 400, 'VALIDATION_ERROR'));
    }

    const allComplaints = db.find('complaints');
    const duplicates = findNearbyDuplicates(targetComplaint, allComplaints, 100);

    res.status(200).json({
      success: true,
      targetComplaint: targetId ? {
        id:            targetComplaint.id,
        complaintCode: targetComplaint.complaint_code || targetComplaint.id,
        title:         targetComplaint.title,
        category:      targetComplaint.category,
        location:      targetComplaint.sector || targetComplaint.location_details,
      } : null,
      configuredRadiusMeters: 100,
      matchCount: duplicates.length,
      data: duplicates,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Link duplicate complaint to a master complaint
 * @route  POST /api/v1/clerk/duplicate-link/:id
 * @body   { masterComplaintId, notes? }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const linkDuplicate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { masterComplaintId, master_complaint_id, notes } = req.body;

    const masterId = masterComplaintId || master_complaint_id;
    if (!masterId) {
      return next(new AppError('masterComplaintId is required to link duplicate.', 400, 'VALIDATION_ERROR'));
    }

    const result = linkDuplicateComplaints(masterId, id, notes, req.user);

    // Audit log
    db.insert('audit_logs', {
      township_id: req.user.township_id,
      user_id:     req.user.id,
      action:      'COMPLAINT_LINKED_AS_DUPLICATE',
      entity_type: 'complaints',
      entity_id:   id,
      old_value:   JSON.stringify({ duplicateId: id }),
      new_value:   JSON.stringify({ masterId, notes }),
    });

    res.status(200).json({
      success: true,
      message: `Complaint ${result.duplicate.complaint_code || result.duplicate.id} successfully linked as duplicate of ${result.master.complaint_code || result.master.id}.`,
      data: {
        master: formatComplaintDetail(result.master),
        duplicate: formatComplaintDetail(result.duplicate),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Validate, Reject & Reroute Complaints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Open complaint for desk clerk review (REPORTED → UNDER_REVIEW)
 * @route  PATCH /api/v1/clerk/complaints/:id/triage
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const triageComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const complaint = db.findOne('complaints', (c) => c.id === id || c.complaint_code === id);
    if (!complaint) {
      return next(new AppError(`Complaint "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    if (complaint.status !== 'REPORTED') {
      return res.status(200).json({
        success: true,
        message: `Complaint is already in ${complaint.status} status.`,
        data: formatComplaintDetail(complaint),
      });
    }

    const now = new Date().toISOString();
    const updated = db.update('complaints', complaint.id, {
      status: 'UNDER_REVIEW',
      reviewed_by: req.user.id,
      reviewed_at: now,
      history: [
        ...(complaint.history || []),
        {
          stage: 'UNDER_REVIEW',
          timestamp: now,
          actor: `${req.user.name} (Desk Clerk)`,
          note: `Complaint opened for review and verification.`,
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Complaint moved to UNDER_REVIEW.',
      data: formatComplaintDetail(updated),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Validate or Reject complaint
 * @route  POST  /api/v1/clerk/validate/:id
 * @route  PATCH /api/v1/clerk/complaints/:id/validate
 * @body   { action: 'VALIDATE'|'REJECT', reason?, remarks? } OR { validated: true/false }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const validateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, validated, reason, rejection_reason, remarks, rejection_remarks } = req.body;

    const isRejection =
      (action && action.toUpperCase() === 'REJECT') ||
      validated === false ||
      Boolean(reason || rejection_reason);

    const complaint = db.findOne('complaints', (c) => c.id === id || c.complaint_code === id);
    if (!complaint) {
      return next(new AppError(`Complaint "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const now = new Date().toISOString();

    if (isRejection) {
      const rejectReason = reason || rejection_reason || 'Rejected by Desk Clerk';
      const rejectRemarks = remarks || rejection_remarks || '';

      const updated = db.update('complaints', complaint.id, {
        status:             'REJECTED',
        rejection_reason:   rejectReason,
        rejection_remarks:  rejectRemarks,
        rejected_by:        req.user.id,
        rejected_at:        now,
        history: [
          ...(complaint.history || []),
          {
            stage: 'REJECTED',
            timestamp: now,
            actor: `${req.user.name} (Desk Clerk)`,
            note: `Complaint rejected. Reason: "${rejectReason}". ${rejectRemarks ? `Remarks: "${rejectRemarks}"` : ''}`,
          },
        ],
      });

      db.insert('audit_logs', {
        township_id: complaint.township_id || req.user.township_id,
        user_id:     req.user.id,
        action:      'COMPLAINT_REJECTED',
        entity_type: 'complaints',
        entity_id:   complaint.id,
        old_value:   JSON.stringify({ status: complaint.status }),
        new_value:   JSON.stringify({ status: 'REJECTED', reason: rejectReason }),
      });

      return res.status(200).json({
        success: true,
        message: `Complaint ${complaint.complaint_code || complaint.id} rejected. Reason: "${rejectReason}".`,
        data: formatComplaintDetail(updated),
      });
    }

    // Validation (approve for Work Order creation)
    const updated = db.update('complaints', complaint.id, {
      status:        'VALIDATED',
      validated_by:  req.user.id,
      validated_at:  now,
      history: [
        ...(complaint.history || []),
        {
          stage: 'VALIDATED',
          timestamp: now,
          actor: `${req.user.name} (Desk Clerk)`,
          note: `Complaint validated. Ready for Work Order creation.`,
        },
      ],
    });

    db.insert('audit_logs', {
      township_id: complaint.township_id || req.user.township_id,
      user_id:     req.user.id,
      action:      'COMPLAINT_VALIDATED',
      entity_type: 'complaints',
      entity_id:   complaint.id,
      old_value:   JSON.stringify({ status: complaint.status }),
      new_value:   JSON.stringify({ status: 'VALIDATED', validatedAt: now }),
    });

    res.status(200).json({
      success: true,
      message: `Complaint ${complaint.complaint_code || complaint.id} validated successfully. Ready for Work Order creation.`,
      data: formatComplaintDetail(updated),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Reject complaint with documented reason
 * @route  PATCH /api/v1/clerk/complaints/:id/reject
 * @body   { reason, remarks? }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const rejectComplaint = async (req, res, next) => {
  req.body.action = 'REJECT';
  return validateComplaint(req, res, next);
};

/**
 * @desc   Reroute complaint to correct department
 * @route  POST /api/v1/clerk/reroute/:id
 * @body   { targetDepartmentId, reason }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const rerouteComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetDepartmentId, target_department_id, targetDepartment, departmentId, reason } = req.body;

    const targetDeptId = targetDepartmentId || target_department_id || departmentId;
    if (!targetDeptId && !targetDepartment) {
      return next(new AppError('targetDepartmentId or targetDepartment is required for rerouting.', 400, 'VALIDATION_ERROR'));
    }

    const complaint = db.findOne('complaints', (c) => c.id === id || c.complaint_code === id);
    if (!complaint) {
      return next(new AppError(`Complaint "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    // Locate target department
    const departments = db.find('departments');
    const targetDept = departments.find(
      (d) =>
        d.id === targetDeptId ||
        d.name.toLowerCase() === (targetDepartment || '').toLowerCase() ||
        (targetDeptId && d.name.toLowerCase().includes(String(targetDeptId).toLowerCase()))
    );

    if (!targetDept) {
      return next(new AppError(`Target department "${targetDeptId || targetDepartment}" not found.`, 404, 'NOT_FOUND'));
    }

    const previousDept = departments.find((d) => d.id === complaint.department_id);
    const prevDeptName = previousDept ? previousDept.name : complaint.category;
    const now = new Date().toISOString();
    const rerouteReason = reason || 'Department re-assignment by Desk Clerk';

    const updated = db.update('complaints', complaint.id, {
      department_id: targetDept.id,
      category:      targetDept.name,
      status:        'REPORTED', // Reset to reported under the new department for fresh review
      history: [
        ...(complaint.history || []),
        {
          stage: 'REROUTED',
          timestamp: now,
          actor: `${req.user.name} (Desk Clerk)`,
          note: `Rerouted from ${prevDeptName} to ${targetDept.name}. Reason: "${rerouteReason}".`,
        },
      ],
    });

    db.insert('audit_logs', {
      township_id: complaint.township_id || req.user.township_id,
      user_id:     req.user.id,
      action:      'COMPLAINT_REROUTED',
      entity_type: 'complaints',
      entity_id:   complaint.id,
      old_value:   JSON.stringify({ departmentId: complaint.department_id, category: complaint.category }),
      new_value:   JSON.stringify({ departmentId: targetDept.id, category: targetDept.name, reason: rerouteReason }),
    });

    res.status(200).json({
      success: true,
      message: `Complaint successfully rerouted to ${targetDept.name}.`,
      data: formatComplaintDetail(updated),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Fetch Eligible Contractors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Retrieve eligible AMC contractors authorized for township and work type
 * @route  GET /api/v1/clerk/contractors
 * @query  ?department_id=&category=&township_id=
 * @access Private (DESK_CLERK, TOWNSHIP_COO, DEPARTMENT_HEAD)
 */
export const getEligibleContractors = async (req, res, next) => {
  try {
    const { department_id, department, category, township_id } = req.query;

    const targetTownshipId = township_id || req.user.township_id;
    const allContractors = db.find('contractors');
    const allAmcs = db.find('amcs');
    const allRates = db.find('amc_rates');
    const allDepartments = db.find('departments');

    // Filter contractors by township & status
    let eligible = allContractors.filter((c) => {
      if (c.status !== 'ACTIVE') return false;
      if (targetTownshipId && c.township_id && c.township_id !== targetTownshipId) return false;
      return true;
    });

    // Match by department / category if provided
    const matchCategory = (category || department || '').toLowerCase();
    const matchDeptId = department_id;

    if (matchCategory || matchDeptId) {
      eligible = eligible.filter((c) => {
        // 1. Direct departments array on contractor
        if (Array.isArray(c.departments)) {
          const hasMatch = c.departments.some(
            (d) => d.toLowerCase().includes(matchCategory) || d === matchDeptId
          );
          if (hasMatch) return true;
        }

        // 2. Active AMC contract linked to target department
        const amc = allAmcs.find(
          (a) =>
            a.contractor_id === c.id &&
            (a.status === 'ACTIVE' || !a.status) &&
            (a.department_id === matchDeptId ||
              (matchCategory &&
                allDepartments.some(
                  (dept) => dept.id === a.department_id && dept.name.toLowerCase().includes(matchCategory)
                )))
        );
        return Boolean(amc);
      });
    }

    // Enrich contractors with active AMC contracts and rate cards
    const enriched = eligible.map((c) => {
      const activeAmc = allAmcs.find(
        (a) => a.contractor_id === c.id && (a.status === 'ACTIVE' || !a.status)
      );

      const applicableRates = activeAmc
        ? allRates.filter((r) => r.amc_id === activeAmc.id)
        : [];

      return {
        id:             c.id,
        name:           c.company_name,
        companyName:    c.company_name,
        contactPerson:  c.contact_person,
        lead:           c.contact_person,
        phone:          c.phone,
        email:          c.email,
        gstin:          c.gstin,
        rating:         c.rating || 4.7,
        status:         c.status,
        departments:    c.departments || [],
        amcContract: activeAmc
          ? {
              id:             activeAmc.id,
              contractNumber: activeAmc.contract_number,
              title:          activeAmc.title,
              startDate:      activeAmc.start_date,
              endDate:        activeAmc.end_date,
              status:         activeAmc.status,
            }
          : null,
        amcContractId: activeAmc ? activeAmc.contract_number : null,
        rateCardsCount: applicableRates.length,
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Handle Escalation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc   Escalate complaint or work order due to SLA delay or operational bottleneck
 * @route  POST /api/v1/clerk/escalate/:id
 * @body   { reason, escalateTo?, notes? }
 * @access Private (DESK_CLERK, TOWNSHIP_COO)
 */
export const escalateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, escalateTo = 'DEPT_HEAD', notes } = req.body;

    if (!reason) {
      return next(new AppError('Escalation reason is required.', 400, 'VALIDATION_ERROR'));
    }

    // Check if ID is a complaint or a work order
    let complaint = db.findOne('complaints', (c) => c.id === id || c.complaint_code === id);
    let workOrder = db.findOne('work_orders', (w) => w.id === id || w.work_order_number === id || w.work_order_code === id);

    if (!complaint && workOrder) {
      complaint = db.findOne('complaints', (c) => c.id === workOrder.complaint_id);
    }
    if (complaint && !workOrder && complaint.work_order_id) {
      workOrder = db.findOne('work_orders', (w) => w.id === complaint.work_order_id);
    }

    if (!complaint && !workOrder) {
      return next(new AppError(`Complaint or Work Order "${id}" not found.`, 404, 'NOT_FOUND'));
    }

    const now = new Date().toISOString();
    const escalationNote = `Escalated to ${escalateTo} by ${req.user.name} (Desk Clerk). Reason: "${reason}". ${notes ? `Notes: "${notes}"` : ''}`;

    // Update complaint
    if (complaint) {
      db.update('complaints', complaint.id, {
        is_escalated:      true,
        escalation_reason: reason,
        escalated_to:      escalateTo,
        escalated_at:      now,
        history: [
          ...(complaint.history || []),
          {
            stage: 'ESCALATED',
            timestamp: now,
            actor: `${req.user.name} (Desk Clerk)`,
            note: escalationNote,
          },
        ],
      });
    }

    // Update work order
    if (workOrder) {
      db.update('work_orders', workOrder.id, {
        is_escalated:      true,
        escalation_reason: reason,
        escalated_to:      escalateTo,
        escalated_at:      now,
      });
    }

    db.insert('audit_logs', {
      township_id: (complaint?.township_id) || req.user.township_id,
      user_id:     req.user.id,
      action:      'SLA_WORK_ESCALATED',
      entity_type: workOrder ? 'work_orders' : 'complaints',
      entity_id:   (workOrder?.id) || complaint?.id,
      old_value:   JSON.stringify({ isEscalated: false }),
      new_value:   JSON.stringify({ isEscalated: true, escalateTo, reason }),
    });

    res.status(200).json({
      success: true,
      message: `Successfully escalated to ${escalateTo}.`,
      data: {
        escalatedTo: escalateTo,
        reason,
        escalatedAt: now,
        complaint: complaint ? formatComplaintDetail(db.findById('complaints', complaint.id)) : null,
        workOrder: workOrder ? formatWorkOrderResponse(db.findById('work_orders', workOrder.id)) : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getTriageQueue,
  getComplaintDetails,
  checkDuplicates,
  linkDuplicate,
  validateComplaint,
  rejectComplaint,
  triageComplaint,
  rerouteComplaint,
  getEligibleContractors,
  escalateComplaint,
  createWorkOrder,
  assignContractor,
  reassignContractor,
  getWorkOrders,
  getWorkOrderById,
};