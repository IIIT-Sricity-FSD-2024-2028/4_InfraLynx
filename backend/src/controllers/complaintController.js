/**
 * TIMS Complaint Controller (Member 1 - RWA Backend)
 * Native PostgreSQL Architecture
 */

import fs from 'fs';
import path from 'path';
import config from '../config/env.js';
import db from '../config/db.js';
import { generateComplaintCode } from '../utils/generateId.js';
import { calculateSlaDeadline, calculateResponseSlaDeadline, evaluateSlaStatus, pauseSla, resumeSla } from '../services/slaService.js';
import { verifyComplaint as verifyService } from '../services/verificationService.js';
import { AppError } from '../middleware/error.js';

const isSafePhotoUrl = (url) => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) return !trimmed.includes('..') && !trimmed.includes('\\');
  if (trimmed.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'data:';
  } catch {
    return false;
  }
};

/**
 * Helper to match department by category name
 */
const findDepartmentByCategory = (category = '', townshipId = null) => {
  const norm = category.toLowerCase();
  const allDepts = db.find('departments');
  const townshipDepts = townshipId ? allDepts.filter((d) => d.township_id === townshipId) : allDepts;
  const departments = townshipDepts.length > 0 ? townshipDepts : allDepts;
  return departments.find((d) => {
    const dName = d.name.toLowerCase();
    if (norm.includes('civil') && dName.includes('civil')) return true;
    if (norm.includes('elec') && dName.includes('elect')) return true;
    if (norm.includes('water') && dName.includes('water')) return true;
    if ((norm.includes('hort') || norm.includes('waste')) && (dName.includes('hort') || dName.includes('waste'))) return true;
    return false;
  }) || departments[0] || null;
};

/**
 * Format complaint with full evidence and SLA status for response
 */
const formatComplaintResponse = (complaint) => {
  const allEvidence = db.findAll('complaint_evidence', (e) => e.complaint_id === complaint.id || e.complaint_id === complaint.complaint_code);
  const wo = db.findOne('work_orders', (w) => w.complaint_id === complaint.id || w.complaint_id === complaint.complaint_code);
  const woEvidence = wo ? db.findAll('work_evidence', (we) => we.work_order_id === wo.id) : [];

  const combinedEvidence = [
    ...allEvidence,
    ...woEvidence.map((w) => ({ ...w, evidence_type: w.type || w.evidence_type })),
  ];

  const beforePhotos = Array.from(
    new Set(
      combinedEvidence
        .filter((e) => (e.evidence_type || e.type) === 'BEFORE')
        .map((e) => e.file_url || e.fileUrl)
        .filter(Boolean)
    )
  );
  const afterPhotos = Array.from(
    new Set(
      combinedEvidence
        .filter((e) => (e.evidence_type || e.type) === 'AFTER')
        .map((e) => e.file_url || e.fileUrl)
        .filter(Boolean)
    )
  );

  const resolvedBefore = Array.from(new Set([...beforePhotos, ...(complaint.beforePhotos || complaint.before_photos || [])].filter(Boolean)));
  const resolvedAfter = Array.from(new Set([...afterPhotos, ...(complaint.afterPhotos || complaint.after_photos || [])].filter(Boolean)));

  const dept = complaint.department_id ? db.findById('departments', complaint.department_id) : null;
  const slaHealth = evaluateSlaStatus(complaint.sla_deadline, complaint.status);

  const loc = complaint.location || {};
  const location = {
    sector: loc.sector || complaint.sector || 'Sector 54',
    block: loc.block || complaint.block || 'Block B',
    street: loc.street || complaint.street || 'Gulmohar Marg',
    assetId: loc.assetId || complaint.asset_id || 'ASSET-GEN-01',
    assetName: loc.assetName || complaint.asset_name || complaint.location_details || 'Township Infrastructure Fixture',
    landmark: loc.landmark || complaint.location_details || '',
  };

  const contractorId = (wo && wo.contractor_id) || complaint.assigned_contractor_id || (complaint.assignedContractor && complaint.assignedContractor.id);
  const rawContractor = contractorId ? db.findOne('contractors', (c) => c.id === contractorId) : null;
  const amcs = db.find('amcs');
  const contractorAmc = rawContractor ? amcs.find((a) => a.contractor_id === rawContractor.id) : null;

  const assignedContractor = rawContractor
    ? {
        id: rawContractor.id,
        name: rawContractor.company_name,
        company_name: rawContractor.company_name,
        lead: rawContractor.contact_person,
        contactPerson: rawContractor.contact_person,
        phone: rawContractor.phone,
        email: rawContractor.email,
        amcContractId: contractorAmc ? contractorAmc.contract_number : 'AMC-CIV-2026',
      }
    : (complaint.assignedContractor || (complaint.assigned_contractor_name ? { name: complaint.assigned_contractor_name, amcContractId: 'AMC-CIV-2026' } : null));

  const workOrderId = (wo && (wo.work_order_code || wo.work_order_number || wo.id)) || complaint.workOrderId || complaint.work_order_code || null;
  const estimateAmount = wo ? wo.estimate_amount : (complaint.estimateAmount ?? complaint.estimate_amount ?? 0);
  const lineItems = (wo && wo.line_items) ? wo.line_items : (complaint.lineItems || complaint.line_items || []);
  const requiresDeptHead = (wo && typeof wo.requires_dept_head === 'boolean') ? wo.requires_dept_head : (complaint.requiresDeptHead ?? complaint.requires_dept_head ?? false);
  const priority = (wo && wo.priority) ? wo.priority : (complaint.priority || 'MEDIUM');

  return {
    ...complaint,
    id: complaint.complaint_code || complaint.id,
    complaint_code: complaint.complaint_code || complaint.id,
    complaintCode: complaint.complaint_code || complaint.id,
    location,
    department_name: dept ? dept.name : null,
    work_order: wo || null,
    work_order_id: workOrderId,
    workOrderId,
    assigned_contractor: assignedContractor,
    assignedContractor,
    assigned_contractor_name: assignedContractor ? (assignedContractor.name || assignedContractor.company_name) : (complaint.assigned_contractor_name || null),
    estimated_cost: estimateAmount,
    estimateAmount,
    line_items: lineItems,
    lineItems,
    requires_dept_head: requiresDeptHead,
    requiresDeptHead,
    priority,
    before_photos: resolvedBefore,
    beforePhotos: resolvedBefore,
    after_photos: resolvedAfter,
    afterPhotos: resolvedAfter,
    sla_deadline: complaint.sla_deadline,
    slaDeadline: complaint.sla_deadline,
    sla_stage: complaint.sla_stage || 'RESPONSE',
    sla_response_deadline: complaint.sla_response_deadline || null,
    sla_paused_at: complaint.sla_paused_at || null,
    sla_paused_duration_ms: complaint.sla_paused_duration_ms || 0,
    sla_health: slaHealth,
  };
};

/**
 * @desc    File new community infrastructure complaint
 * @route   POST /api/v1/complaints
 * @access  Private (RWA, TOWNSHIP_COO)
 */
export const createComplaint = async (req, res, next) => {
  try {
    const {
      title,
      category,
      subcategory,
      subCategory,
      severity = 'MEDIUM',
      description,
      location = {},
      sector,
      block,
      street,
      assetId,
      assetName,
      landmark,
      photos: rawPhotos = [],
    } = req.body;

    const chosenCategory = category || 'Civil';
    const chosenSubCategory = subcategory || subCategory || 'General Issue';
    const chosenSeverity = (severity || 'MEDIUM').toUpperCase();

    if (!description && !title) {
      return next(new AppError('Please provide a complaint description or title.', 400, 'VALIDATION_ERROR'));
    }

    // Resolve location parameters
    const locSector = location.sector || sector || req.user.sector || 'Sector 54';
    const locBlock = location.block || block || 'Block A';
    const locStreet = location.street || street || 'Gulmohar Marg';
    const rawAssetId = location.assetId || assetId;
    const isUuid = (str) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
    const matchedAsset = rawAssetId ? db.findOne('assets', (a) => a.id === rawAssetId || a.name === rawAssetId) : null;
    const locAssetId = matchedAsset ? matchedAsset.id : (isUuid(rawAssetId) ? rawAssetId : null);
    const locAssetName = location.assetName || assetName || (typeof rawAssetId === 'string' ? rawAssetId : 'Township Infrastructure Fixture');
    const locLandmark = location.landmark || landmark || `Near ${locBlock} entrance`;

    // Department Auto-Routing
    const dept = findDepartmentByCategory(chosenCategory, req.user.township_id);

    // Generate Business Code & SLA Deadline
    const complaintCode = generateComplaintCode();
    const now = new Date().toISOString();
    const slaDeadline = calculateSlaDeadline(chosenSeverity, now);
    const slaResponseDeadline = calculateResponseSlaDeadline(chosenSeverity, now, req.user.township_id);

    // Process photo URLs from files upload or body payload
    const uploadedFileUrls = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const bodyPhotos = Array.isArray(rawPhotos) ? rawPhotos : (rawPhotos ? [rawPhotos] : []);
    const safeBodyPhotos = bodyPhotos.map((url) => String(url).trim()).filter(isSafePhotoUrl);
    if (safeBodyPhotos.length !== bodyPhotos.length) {
      return next(new AppError('Photo evidence must use safe http(s) URLs or server upload paths.', 400, 'INVALID_PHOTO_URL'));
    }

    const resolvedBodyPhotos = [];
    for (const rawUrl of safeBodyPhotos) {
      let finalUrl = rawUrl;
      if (rawUrl.startsWith('data:image/')) {
        try {
          const matches = rawUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : (mimeType.includes('svg') || buffer.slice(0, 10).toString().includes('<svg')) ? '.svg' : '.jpg';
            const filename = `evidence-${crypto.randomUUID()}${ext}`;
            const uploadDir = config.upload?.dir || path.resolve('uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path.join(uploadDir, filename);
            fs.writeFileSync(filePath, buffer);
            finalUrl = `/uploads/${filename}`;
          }
        } catch (fErr) {
          console.warn('[createComplaint] Error saving base64 to file:', fErr.message);
        }
      }
      resolvedBodyPhotos.push(finalUrl);
    }
    const photoUrls = [...uploadedFileUrls, ...resolvedBodyPhotos];

    const newComplaint = db.insert('complaints', {
      complaint_code: complaintCode,
      township_id: req.user.township_id || 'b0000000-0000-0000-0000-000000000001',
      reported_by: req.user.id,
      department_id: dept ? dept.id : null,
      category: chosenCategory,
      subcategory: chosenSubCategory,
      title: title || `${chosenCategory}: ${chosenSubCategory}`,
      description: description || title || '',
      severity: chosenSeverity,
      status: 'REPORTED',
      sla_deadline: slaDeadline,
      sla_stage: 'RESPONSE',
      sla_response_deadline: slaResponseDeadline,
      sla_status: 'ON_TIME',
      sector: locSector,
      block: locBlock,
      street: locStreet,
      asset_id: locAssetId,
      asset_name: locAssetName,
      location_details: `${locBlock}, ${locStreet} (${locLandmark})`,
      reported_by_name: req.user.name,
      reported_by_role: req.user.role,
      beforePhotos: photoUrls,
      created_at: now,
      history: [
        {
          stage: 'REPORTED',
          timestamp: now,
          actor: `${req.user.name} (${req.user.role})`,
          note: `Issue logged under ${chosenCategory} (${chosenSubCategory}). Priority: ${chosenSeverity}. SLA target: ${slaDeadline}.`,
        },
      ],
    });

    // Save evidence photos to complaint_evidence table
    if (photoUrls.length > 0) {
      for (const url of photoUrls) {
        db.insert('complaint_evidence', {
          complaint_id: newComplaint.id,
          evidence_type: 'BEFORE',
          file_url: url,
          caption: 'Before-repair photograph evidence',
          uploaded_by: req.user.id,
          created_at: now,
        });
      }
    }

    // Record Audit Log Entry
    db.logAudit({
      township_id: newComplaint.township_id,
      entity_type: 'COMPLAINT',
      entity_id: newComplaint.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'REPORTED',
      from_state: null,
      to_state: 'REPORTED',
      notes: `Ticket ${complaintCode} reported by ${req.user.name}.`,
    });

    res.status(201).json({
      success: true,
      message: `Complaint ${complaintCode} logged successfully.`,
      data: formatComplaintResponse(newComplaint),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of complaints (with multi-township filter & optional query parameters)
 * @route   GET /api/v1/complaints
 * @access  Private
 */
export const getComplaints = async (req, res, next) => {
  try {
    const { status, severity, category, sector, myOnly } = req.query;

    const userTownshipId = req.user.township_id;

    let complaints = db.find('complaints', (c) => {
      // 1. Township isolation
      if (userTownshipId && c.township_id && c.township_id !== userTownshipId) return false;

      // 2. RWA Secretary sees all complaints in their township/jurisdiction; filter only if myOnly is set
      if (myOnly === 'true' && c.reported_by !== req.user.id) return false;

      // 3. Filter by status
      if (status && (c.status || '').toUpperCase() !== status.toUpperCase()) return false;

      // 4. Filter by severity
      if (severity && (c.severity || '').toUpperCase() !== severity.toUpperCase()) return false;

      // 5. Filter by category
      if (category && (c.category || '').toLowerCase() !== category.toLowerCase()) return false;

      // 6. Filter by sector
      if (sector && (c.sector || '').toLowerCase() !== sector.toLowerCase()) return false;

      return true;
    });

    const formatted = complaints.map((c) => formatComplaintResponse(c, { listMode: true }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single complaint details with timeline & attached evidence
 * @route   GET /api/v1/complaints/:id
 * @access  Private
 */
export const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = db.findOne('complaints', (c) => c.id === id || c.complaint_code === id);

    if (!complaint) {
      return next(new AppError(`Complaint with identifier '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    // Multi-township isolation
    if (req.user.township_id && complaint.township_id !== req.user.township_id) {
      return next(new AppError('Cross-township access forbidden.', 403, 'FORBIDDEN'));
    }

    res.status(200).json({
      success: true,
      data: formatComplaintResponse(complaint),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify and close completed repair work
 * @route   POST /api/v1/complaints/:id/verify
 * @access  Private (RWA)
 */
export const verifyComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, remarks } = req.body;

    const updated = await verifyService(id, req.user, { rating, remarks });

    res.status(200).json({
      success: true,
      message: `Complaint ${updated.complaint_code || id} verified and closed successfully.`,
      data: formatComplaintResponse(updated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update/Edit an existing complaint (RWA Mistake Correction)
 * @route   PUT /api/v1/complaints/:id
 * @access  Private (RWA, TOWNSHIP_COO, DESK_CLERK)
 */
export const updateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = db.findOne('complaints', (c) => c.id === id || c.complaint_code === id);

    if (!complaint) {
      return next(new AppError(`Complaint with identifier '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    if (req.user.township_id && complaint.township_id !== req.user.township_id) {
      return next(new AppError('Cross-township modification forbidden.', 403, 'FORBIDDEN'));
    }

    // Human fallibility safeguard: only allow editing before work begins
    const editableStatuses = ['REPORTED', 'UNDER_REVIEW'];
    if (!editableStatuses.includes((complaint.status || '').toUpperCase())) {
      return next(
        new AppError(
          `Cannot edit complaint in status '${complaint.status}'. Work order has already been initiated. Please contact Desk Clerk.`,
          400,
          'IMMUTABLE_STAGE'
        )
      );
    }

    const {
      title,
      description,
      category,
      subcategory,
      subCategory,
      severity,
      location = {},
      landmark,
      photos,
    } = req.body;

    const now = new Date().toISOString();
    const updates = {};
    const oldSnapshot = {
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      severity: complaint.severity,
      location_details: complaint.location_details,
    };

    if (title) updates.title = title.trim();
    if (description) updates.description = description.trim();
    if (category) {
      updates.category = category;
      const dept = findDepartmentByCategory(category);
      if (dept) updates.department_id = dept.id;
    }
    if (subcategory || subCategory) updates.subcategory = subcategory || subCategory;
    if (severity) {
      updates.severity = severity.toUpperCase();
      updates.sla_deadline = calculateSlaDeadline(updates.severity, complaint.created_at || now, complaint.township_id);
    }

    if (location && typeof location === 'object') {
      if (location.sector) updates.sector = location.sector;
      if (location.block) updates.block = location.block;
      if (location.street) updates.street = location.street;
      if (location.landmark || landmark) {
        updates.location_details = `${updates.block || complaint.block || ''}, ${updates.street || complaint.street || ''} (${location.landmark || landmark})`;
      }
    } else if (landmark) {
      updates.location_details = `${complaint.block || ''}, ${complaint.street || ''} (${landmark})`;
    }

    if (Array.isArray(photos)) {
      updates.beforePhotos = photos;
    }

    updates.last_edited_at = now;
    updates.updated_at = now;

    const editHistory = complaint.edit_history || [];
    editHistory.push({
      edited_at: now,
      edited_by: `${req.user.name} (${req.user.role})`,
      previous_state: oldSnapshot,
    });
    updates.edit_history = editHistory;

    const history = complaint.history || [];
    history.push({
      stage: 'EDITED',
      timestamp: now,
      actor: `${req.user.name} (${req.user.role})`,
      note: `Ticket details updated by reporter/manager.`,
    });
    updates.history = history;

    const updated = db.update('complaints', complaint.id, updates);

    db.logAudit({
      township_id: complaint.township_id,
      entity_type: 'COMPLAINT',
      entity_id: complaint.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'COMPLAINT_EDITED',
      from_state: JSON.stringify(oldSnapshot),
      to_state: JSON.stringify(updates),
      notes: `Ticket ${complaint.complaint_code || complaint.id} updated by ${req.user.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully.',
      data: formatComplaintResponse(updated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a complaint before execution starts (RWA Mistake / False Alarm Correction)
 * @route   POST /api/v1/complaints/:id/cancel
 * @access  Private (RWA, TOWNSHIP_COO, DESK_CLERK)
 */
export const cancelComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by resident' } = req.body;

    const complaint = db.findOne('complaints', (c) => c.id === id || c.complaint_code === id);

    if (!complaint) {
      return next(new AppError(`Complaint with identifier '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    if (req.user.township_id && complaint.township_id !== req.user.township_id) {
      return next(new AppError('Cross-township cancellation forbidden.', 403, 'FORBIDDEN'));
    }

    // Cannot cancel if repair work has physically started or completed
    const nonCancellable = ['IN_PROGRESS', 'COMPLETED', 'PENDING_VERIFICATION', 'VERIFIED'];
    if (nonCancellable.includes((complaint.status || '').toUpperCase())) {
      return next(
        new AppError(
          `Cannot cancel complaint in status '${complaint.status}'. Work execution has commenced. Please contact Desk Clerk.`,
          400,
          'CANCELLATION_BLOCKED'
        )
      );
    }

    const now = new Date().toISOString();
    const updated = db.update('complaints', complaint.id, {
      status: 'CLOSED',
      cancellation_reason: reason,
      cancelled_at: now,
      cancelled_by: req.user.id,
      rejection_reason: `Cancelled by reporter: ${reason}`,
      updated_at: now,
      history: [
        ...(complaint.history || []),
        {
          stage: 'CANCELLED',
          timestamp: now,
          actor: `${req.user.name} (${req.user.role})`,
          note: `Complaint cancelled by user. Reason: "${reason}"`,
        },
      ],
    });

    db.logAudit({
      township_id: complaint.township_id,
      entity_type: 'COMPLAINT',
      entity_id: complaint.id,
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'COMPLAINT_CANCELLED',
      from_state: complaint.status,
      to_state: 'CLOSED',
      notes: `Ticket cancelled: ${reason}`,
    });

    res.status(200).json({
      success: true,
      message: 'Complaint cancelled successfully.',
      data: formatComplaintResponse(updated),
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc   Pause complaint SLA clock (for citizen clarification / external hold)
 * @route  POST /api/v1/complaints/:id/pause
 * @access Private (RWA, DESK_CLERK, TOWNSHIP_COO)
 */
export const pauseComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Awaiting citizen clarification' } = req.body;
    const paused = pauseSla('complaints', id, reason, req.user);
    if (!paused) {
      return next(new AppError(`Complaint "${id}" not found.`, 404, 'NOT_FOUND'));
    }
    res.status(200).json({
      success: true,
      message: 'Complaint SLA clock paused.',
      data: formatComplaintResponse(paused),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Resume complaint SLA clock and extend deadline
 * @route  POST /api/v1/complaints/:id/resume
 * @access Private (RWA, DESK_CLERK, TOWNSHIP_COO)
 */
export const resumeComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resumed = resumeSla('complaints', id, req.user);
    if (!resumed) {
      return next(new AppError(`Complaint "${id}" not found.`, 404, 'NOT_FOUND'));
    }
    res.status(200).json({
      success: true,
      message: 'Complaint SLA clock resumed and deadline extended.',
      data: formatComplaintResponse(resumed),
    });
  } catch (err) {
    next(err);
  }
};

export default {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  cancelComplaint,
  verifyComplaint,
  pauseComplaint,
  resumeComplaint,
};
