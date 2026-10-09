/**
 * duplicateService.js — TIMS Duplicate Complaint Detection Service (Member 2)
 *
 * Implements the 100m radius duplicate detection rule specified for TIMS:
 * - Distance calculation using Haversine formula (<= 100 meters)
 * - Category / Sub-category similarity matching
 * - Status awareness (active issues within the same township)
 * - Linking duplicate complaints to a master complaint
 */

import db from '../config/db.js';

/**
 * Parses GPS strings like "28.5355° N, 77.3910° E" or numeric coordinates
 * @param {string|object} gps
 * @returns {{ lat: number, lng: number } | null}
 */
export function parseCoordinates(gps) {
  if (!gps) return null;

  if (typeof gps === 'object' && gps.lat !== undefined && gps.lng !== undefined) {
    return { lat: Number(gps.lat), lng: Number(gps.lng) };
  }

  if (typeof gps === 'string') {
    // Format: "28.5355° N, 77.3910° E" or "28.5355, 77.3910"
    const cleaned = gps.replace(/[°NSEWnsew\s]/g, '');
    const parts = gps.split(/[,;]/);
    if (parts.length >= 2) {
      const latVal = parseFloat(parts[0].replace(/[^\d.-]/g, ''));
      const lngVal = parseFloat(parts[1].replace(/[^\d.-]/g, ''));
      if (!isNaN(latVal) && !isNaN(lngVal)) {
        return { lat: latVal, lng: lngVal };
      }
    }
  }

  return null;
}

/**
 * Calculates distance between two points in meters using Haversine formula
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Finds potential duplicate complaints for a given complaint or location
 * @param {object} targetComplaint - The complaint being checked
 * @param {Array<object>} allComplaints - Pool of active complaints in the township
 * @param {number} [radiusMeters=100] - Default 100 meters per TIMS specification
 * @returns {Array<object>} List of duplicate matches with distance and confidence
 */
export function findNearbyDuplicates(targetComplaint, allComplaints = [], radiusMeters = 100) {
  if (!targetComplaint) return [];

  const targetCoords = parseCoordinates(
    targetComplaint.location?.gps || targetComplaint.gps || targetComplaint.location_details ||
    (targetComplaint.latitude && targetComplaint.longitude ? { lat: targetComplaint.latitude, lng: targetComplaint.longitude } : null)
  );
  const targetCategory = (targetComplaint.category || '').toLowerCase();
  const targetSector = (targetComplaint.location?.sector || targetComplaint.sector || '').toLowerCase();
  const targetId = targetComplaint.id || targetComplaint.complaint_code;

  const duplicates = [];

  for (const item of allComplaints) {
    const itemId = item.id || item.complaint_code;
    if (itemId === targetId) continue; // skip self

    // Skip closed or rejected complaints older than 7 days
    if (item.status === 'REJECTED' || item.status === 'CLOSED') continue;

    const itemCategory = (item.category || '').toLowerCase();
    const itemSector = (item.location?.sector || item.sector || '').toLowerCase();
    const categoryMatch = targetCategory && itemCategory && targetCategory === itemCategory;
    const sectorMatch = targetSector && itemSector && targetSector === itemSector;

    const itemCoords = parseCoordinates(
      item.location?.gps || item.gps || item.location_details ||
      (item.latitude && item.longitude ? { lat: item.latitude, lng: item.longitude } : null)
    );

    let distanceMeters = null;
    let isWithinRadius = false;

    if (targetCoords && itemCoords) {
      distanceMeters = haversineDistanceMeters(
        targetCoords.lat,
        targetCoords.lng,
        itemCoords.lat,
        itemCoords.lng
      );
      isWithinRadius = distanceMeters <= radiusMeters;
    } else {
      // If GPS is missing, check sector + street/asset similarity
      const targetAsset = (targetComplaint.location?.assetId || targetComplaint.asset_id || '').toLowerCase();
      const itemAsset = (item.location?.assetId || item.asset_id || '').toLowerCase();
      if (sectorMatch && targetAsset && targetAsset === itemAsset) {
        distanceMeters = 25; // estimated proximity
        isWithinRadius = true;
      }
    }

    if (isWithinRadius || (categoryMatch && sectorMatch && distanceMeters !== null && distanceMeters <= 150)) {
      // Calculate confidence score (0 to 100%)
      let confidence = 50;
      if (categoryMatch) confidence += 30;
      if (isWithinRadius) confidence += 20;
      if (distanceMeters !== null && distanceMeters <= 50) confidence += 10;
      confidence = Math.min(100, confidence);

      duplicates.push({
        complaint: {
          id: item.id,
          complaintCode: item.complaint_code || item.id,
          title: item.title,
          category: item.category,
          subcategory: item.subcategory,
          severity: item.severity,
          status: item.status,
          sector: item.sector || item.location?.sector,
          block: item.block || item.location?.block,
          createdAt: item.created_at || item.createdAt,
        },
        distanceMeters: distanceMeters !== null ? distanceMeters : 'Sector Proximity (~50m)',
        isWithin100m: isWithinRadius,
        categoryMatch,
        confidence,
        reason: `${isWithinRadius ? 'Within 100m radius' : 'Same Sector'}${categoryMatch ? ' & Identical category' : ''}`,
      });
    }
  }

  // Sort highest confidence first
  return duplicates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Links a duplicate complaint to a master complaint
 * @param {string} masterId - Master complaint ID
 * @param {string} duplicateId - Duplicate complaint ID
 * @param {string} notes - Optional linking remarks
 * @param {object} actor - User linking the duplicate
 */
export function linkDuplicateComplaints(masterId, duplicateId, notes = '', actor = { name: 'Desk Clerk' }) {
  const master = db.findOne('complaints', (c) => c.id === masterId || c.complaint_code === masterId);
  const duplicate = db.findOne('complaints', (c) => c.id === duplicateId || c.complaint_code === duplicateId);

  if (!master) throw new Error(`Master complaint "${masterId}" not found.`);
  if (!duplicate) throw new Error(`Duplicate complaint "${duplicateId}" not found.`);
  if (master.id === duplicate.id) throw new Error('Cannot link a complaint to itself as duplicate.');

  const now = new Date().toISOString();
  const masterCode = master.complaint_code || master.id;

  // 1. Mark duplicate complaint
  const updatedDuplicate = db.update('complaints', duplicate.id, {
    is_duplicate: true,
    master_complaint_id: master.id,
    status: 'REJECTED',
    rejection_reason: `Duplicate of master complaint ${masterCode}`,
    rejection_remarks: notes || `Linked as duplicate to ${masterCode} by ${actor.name}`,
    rejected_at: now,
    history: [
      ...(duplicate.history || []),
      {
        stage: 'REJECTED',
        timestamp: now,
        actor: actor.name,
        note: `Marked as duplicate of ${masterCode}. ${notes ? `Remarks: "${notes}"` : ''}`,
      },
    ],
  });

  // 2. Update master complaint linked count
  const currentLinked = Array.isArray(master.linked_duplicates) ? master.linked_duplicates : [];
  const updatedMaster = db.update('complaints', master.id, {
    duplicate_count: (master.duplicate_count || 0) + 1,
    linked_duplicates: [...currentLinked, duplicate.id],
    history: [
      ...(master.history || []),
      {
        stage: master.status,
        timestamp: now,
        actor: actor.name,
        note: `Linked duplicate complaint ${duplicate.complaint_code || duplicate.id} to this master issue.`,
      },
    ],
  });

  return { master: updatedMaster, duplicate: updatedDuplicate };
}

export default {
  parseCoordinates,
  haversineDistanceMeters,
  findNearbyDuplicates,
  linkDuplicateComplaints,
};