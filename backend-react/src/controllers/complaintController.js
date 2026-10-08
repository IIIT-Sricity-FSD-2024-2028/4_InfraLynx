/**
 * TIMS Complaint Controller (Member 1 - RWA Backend)
 * 100% In-Memory Architecture - Zero external PostgreSQL daemon required.
 */

import db from '../config/db.js';
import { generateComplaintCode } from '../utils/generateId.js';
import { calculateSlaDeadline, evaluateSlaStatus } from '../services/slaService.js';
import { verifyComplaint as verifyService, disputeComplaint as disputeService } from '../services/verificationService.js';
import { AppError } from '../middleware/error.js';

/**
 * Helper to match department by category name
 */
const findDepartmentByCategory = (category = '') => {
  const norm = category.toLowerCase();
  const departments = db.find('departments');
  return departments.find((d) => {
    const dName = d.name.toLowerCase();
    if (norm.includes('civil') && dName.includes('civil')) return true;
    if (norm.includes('elec') && dName.includes('elect')) return true;
    if (norm.includes('water') && dName.includes('water')) return true;
    return false;
  }) || departments[0] || null;
};

/**
 * Format complaint with full evidence and SLA status for response
 */
const formatComplaintResponse = (complaint) => {
  const allEvidence = db.find('complaint_evidence', (e) => e.complaint_id === complaint.id);
  const beforePhotos = allEvidence
    .filter((e) => e.evidence_type === 'BEFORE')
    .map((e) => e.file_url);
  const afterPhotos = allEvidence
    .filter((e) => e.evidence_type === 'AFTER')
    .map((e) => e.file_url);
  const disputePhotos = allEvidence
    .filter((e) => e.evidence_type === 'DISPUTE')
    .map((e) => e.file_url);

  const dept = complaint.department_id ? db.findById('departments', complaint.department_id) : null;
  const wo = db.findOne('work_orders', (w) => w.complaint_id === complaint.id || w.complaint_id === complaint.complaint_code);
  const slaHealth = evaluateSlaStatus(complaint.sla_deadline, complaint.status);

  const loc = complaint.location || {};
  const location = {
    sector: loc.sector || complaint.sector || 'Sector 54',
    block: loc.block || complaint.block || 'Block B',
    street: loc.street || complaint.street || 'Gulmohar Marg',
    assetId: loc.assetId || complaint.asset_id || 'ASSET-GEN-01',
    assetName: loc.assetName || complaint.asset_name || complaint.location_details || 'Township Infrastructure Fixture',
    landmark: loc.landmark || complaint.location_details || '',
    gps: loc.gps || complaint.gps || '28.5355° N, 77.3910° E',
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
    location,
    department_name: dept ? dept.name : null,
    work_order: wo || null,
    workOrderId,
    assignedContractor,
    assigned_contractor_name: assignedContractor ? assignedContractor.name : (complaint.assigned_contractor_name || null),
    estimateAmount,
    lineItems,
    requiresDeptHead,
    priority,
    beforePhotos: beforePhotos.length > 0 ? beforePhotos : (complaint.beforePhotos || []),
    afterPhotos: afterPhotos.length > 0 ? afterPhotos : (complaint.afterPhotos || []),
    disputePhotos,
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
      gps,
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
    const locAssetId = location.assetId || assetId || 'ASSET-GEN-01';
    const locAssetName = location.assetName || assetName || 'Township Infrastructure Fixture';
    const locLandmark = location.landmark || landmark || `Near ${locBlock} entrance`;
    const locGps = location.gps || gps || '28.5355° N, 77.3910° E';

    // Department Auto-Routing
    const dept = findDepartmentByCategory(chosenCategory);

    // Generate Business Code & SLA Deadline
    const complaintCode = generateComplaintCode();
    const now = new Date().toISOString();
    const slaDeadline = calculateSlaDeadline(chosenSeverity, now);

    // Process photo URLs from files upload or body payload
    const uploadedFileUrls = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const bodyPhotos = Array.isArray(rawPhotos) ? rawPhotos : (rawPhotos ? [rawPhotos] : []);
    const photoUrls = [...uploadedFileUrls, ...bodyPhotos];

    const newComplaint = db.insert('complaints', {
      complaint_code: complaintCode,
      township_id: req.user.townshipId || 'b0000000-0000-0000-0000-000000000001',
      reported_by: req.user.id,
      department_id: dept ? dept.id : null,
      category: chosenCategory,
      subcategory: chosenSubCategory,
      title: title || `${chosenCategory}: ${chosenSubCategory}`,
      description: description || title || '',
      severity: chosenSeverity,
      status: 'REPORTED',
      sla_deadline: slaDeadline,
      sector: locSector,
      block: locBlock,
      street: locStreet,
      asset_id: locAssetId,
      asset_name: locAssetName,
      location_details: `${locBlock}, ${locStreet} (${locLandmark})`,
      gps: locGps,
      reported_by_name: req.user.name,
      reported_by_role: req.user.role,
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

    const userTownshipId = req.user.townshipId;

    let complaints = db.find('complaints', (c) => {
      // 1. Township isolation
      if (userTownshipId && c.township_id !== userTownshipId) return false;

      // 2. Filter by user if myOnly is true
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

    const formatted = complaints.map(formatComplaintResponse);

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
    const complaint = db.findById('complaints', id);

    if (!complaint) {
      return next(new AppError(`Complaint with identifier '${id}' not found.`, 404, 'NOT_FOUND'));
    }

    // Multi-township isolation
    if (req.user.townshipId && complaint.township_id !== req.user.townshipId) {
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
 * @desc    Dispute repair work and request corrective field rework
 * @route   POST /api/v1/complaints/:id/dispute
 * @access  Private (RWA)
 */
export const disputeComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, remarks, notes, photos: bodyPhotos = [] } = req.body;

    // Collect uploaded dispute evidence files if any
    const uploadedFileUrls = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const incomingPhotos = Array.isArray(bodyPhotos) ? bodyPhotos : (bodyPhotos ? [bodyPhotos] : []);
    const photos = [...uploadedFileUrls, ...incomingPhotos];

    const updated = await disputeService(id, req.user, {
      reason,
      remarks,
      notes,
      photos,
    });

    res.status(200).json({
      success: true,
      message: `Complaint ${updated.complaint_code || id} marked as DISPUTED. Routed to contractor rework queue.`,
      data: formatComplaintResponse(updated),
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createComplaint,
  getComplaints,
  getComplaintById,
  verifyComplaint,
  disputeComplaint,
};
