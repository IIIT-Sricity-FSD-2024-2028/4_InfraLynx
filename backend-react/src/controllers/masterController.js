/**
 * TIMS Master Data Controller (PostgreSQL Engine)
 * Exposes reference data: Contractors, Departments, AMC Rate Cards, and DB Refresh.
 */

import db from '../config/db.js';

const getUserTownshipId = (user) => user.township_id;

export const getContractors = async (req, res, next) => {
  try {
    const townshipId = getUserTownshipId(req.user);
    let rawContractors = db.find('contractors', (c) => !townshipId || c.township_id === townshipId);
    if (!rawContractors || rawContractors.length === 0) {
      rawContractors = db.find('contractors');
    }
    const amcs = db.find('amcs', (a) => !townshipId || a.township_id === townshipId);
    const departments = db.find('departments', (d) => !townshipId || d.township_id === townshipId);

    const ratingsMap = {
      'c0000000-0000-0000-0000-000000000001': 4.8,
      'c0000000-0000-0000-0000-000000000002': 4.6,
      'c0000000-0000-0000-0000-000000000003': 4.9,
    };

    const allUsers = db.find('users');
    const allServices = db.find('contractor_services');

    const contractors = rawContractors.map((c) => {
      const contractorAmcs = amcs.filter((a) => a.contractor_id === c.id);
      const contractorServices = allServices
        .filter((s) => s.contractor_id === c.id)
        .map((s) => s.service_type);

      const deptNames = [];
      contractorAmcs.forEach((a) => {
        const dept = departments.find((d) => d.id === a.department_id);
        if (!dept) return;
        const dLower = dept.name.toLowerCase();
        deptNames.push(dept.name);
        if (dLower.includes('civil')) deptNames.push('Civil', 'Roads');
        if (dLower.includes('elect')) deptNames.push('Electrical', 'Power');
        if (dLower.includes('water')) deptNames.push('Water', 'Sanitation');
        if (dLower.includes('hort') || dLower.includes('waste')) deptNames.push('Horticulture', 'Waste');
      });

      if (deptNames.length === 0) {
        const cn = (c.company_name || '').toLowerCase();
        if (cn.includes('civil') || cn.includes('infra') || cn.includes('road')) deptNames.push('Civil', 'Roads');
        if (cn.includes('power') || cn.includes('elect')) deptNames.push('Electrical', 'Power');
        if (cn.includes('water') || cn.includes('hydro')) deptNames.push('Water', 'Sanitation');
        if (cn.includes('environ') || cn.includes('waste') || cn.includes('swachh')) deptNames.push('Horticulture', 'Waste');
      }

      const mergedDepartments = Array.from(new Set([...deptNames, ...contractorServices]));
      const primaryAmc = contractorAmcs[0];

      // Find official contractor user account (firstname.lastname@infralynx.com)
      const officialUser = allUsers.find(
        (u) => u.contractor_id === c.id && u.role === 'FIELD_CONTRACTOR' && u.email?.includes('@infralynx.com') && !u.email.startsWith('contractor@')
      ) || allUsers.find((u) => u.contractor_id === c.id && u.role === 'FIELD_CONTRACTOR');

      return {
        ...c,
        id: c.id,
        name: c.company_name,
        company_name: c.company_name,
        lead: c.contact_person,
        contact_person: c.contact_person,
        phone: c.phone,
        email: officialUser ? officialUser.email : c.email,
        official_email: officialUser ? officialUser.email : c.email,
        departments: mergedDepartments.length > 0 ? mergedDepartments : ['General'],
        amcContractId: primaryAmc ? primaryAmc.contract_number : 'AMC-GEN-2025',
        status: c.status === 'ACTIVE' ? 'Active' : c.status,
        rating: ratingsMap[c.id] || 4.7,
      };
    });

    res.status(200).json({ success: true, count: contractors.length, data: contractors });
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (req, res, next) => {
  try {
    const townshipId = getUserTownshipId(req.user);
    const departments = db.find('departments', (d) => !townshipId || d.township_id === townshipId);
    res.status(200).json({ success: true, count: departments.length, data: departments });
  } catch (error) {
    next(error);
  }
};

export const getAmcRates = async (req, res, next) => {
  try {
    const townshipId = getUserTownshipId(req.user);
    const amcs = db.find('amcs', (a) => !townshipId || a.township_id === townshipId);
    const amcIds = new Set(amcs.map((a) => a.id));
    const rawRates = db.find('amc_rates', (r) => amcIds.has(r.amc_id));
    const departments = db.find('departments', (d) => !townshipId || d.township_id === townshipId);

    const rates = rawRates.map((r) => {
      const amc = amcs.find((a) => a.id === r.amc_id);
      let deptName = 'General';
      if (amc) {
        const dept = departments.find((d) => d.id === amc.department_id);
        if (dept) {
          if (dept.name.toLowerCase().includes('civil')) deptName = 'Civil';
          else if (dept.name.toLowerCase().includes('elect')) deptName = 'Electrical';
          else if (dept.name.toLowerCase().includes('water')) deptName = 'Water';
          else deptName = dept.name;
        }
      }

      const normalizedId = (r.item_code || `rate-${r.id}`).toLowerCase();

      return {
        ...r,
        id: normalizedId,
        service: r.item_name,
        item_name: r.item_name,
        unit: r.unit,
        rate: Number(r.rate),
        department: deptName,
      };
    });

    res.status(200).json({ success: true, count: rates.length, data: rates });
  } catch (error) {
    next(error);
  }
};

export const resetDatabase = async (req, res, next) => {
  try {
    await db.reset();
    res.status(200).json({ success: true, message: 'Database state refreshed from PostgreSQL.' });
  } catch (error) {
    next(error);
  }
};

export default {
  getContractors,
  getDepartments,
  getAmcRates,
  resetDatabase,
};
