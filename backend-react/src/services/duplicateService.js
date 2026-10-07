/**
 * duplicateService.js — TIMS Duplicate Complaint Detection Service (Member 2)
 *
 * Implements the 100m radius duplicate detection rule specified for TIMS:
 * - Distance calculation using Haversine formula (<= 100 meters)
 * - Category / Sub-category similarity matching
 * - Status awareness (active issues within the same township)
 */

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
    targetComplaint.location?.gps || targetComplaint.gps || targetComplaint.location_details
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

    const itemCoords = parseCoordinates(item.location?.gps || item.gps || item.location_details);

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

    if (isWithinRadius || (categoryMatch && sectorMatch && distanceMeters !== null && distanceMeters <= 200)) {
      // Calculate confidence score (0 to 100%)
      let confidence = 50;
      if (categoryMatch) confidence += 30;
      if (isWithinRadius) confidence += 20;
      if (distanceMeters !== null && distanceMeters <= 50) confidence += 10;
      confidence = Math.min(100, confidence);

      duplicates.push({
        complaint: item,
        distanceMeters: distanceMeters ?? 'Sector Match (~50m)',
        isWithin100m: isWithinRadius,
        categoryMatch,
        confidence,
        reason: `${isWithinRadius ? 'Within 100m proximity' : 'Same Sector'}${categoryMatch ? ' & Identical category' : ''}`,
      });
    }
  }

  // Sort highest confidence first
  return duplicates.sort((a, b) => b.confidence - a.confidence);
}

export default {
  parseCoordinates,
  haversineDistanceMeters,
  findNearbyDuplicates,
};
