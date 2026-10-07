/**
 * TIMS Master Data Controller (In-Memory Engine)
 * Exposes reference data: Contractors, Departments, AMC Rate Cards, and DB Reset.
 */

import inMemoryDb from '../config/inMemoryDb.js';

export const getContractors = async (req, res, next) => {
  try {
    const rawContractors = inMemoryDb.find('contractors');
    const amcs = inMemoryDb.find('amcs');
    const departments = inMemoryDb.find('departments');

    const ratingsMap = {
      'c0000000-0000-0000-0000-000000000001': 4.8,
      'c0000000-0000-0000-0000-000000000002': 4.6,
      'c0000000-0000-0000-0000-000000000003': 4.9,
    };

    const contractors = rawContractors.map((c) => {
      const contractorAmcs = amcs.filter((a) => a.contractor_id === c.id);
      const deptNames = contractorAmcs
        .map((a) => {
          const dept = departments.find((d) => d.id === a.department_id);
          if (!dept) return null;
          if (dept.name.toLowerCase().includes('civil')) return 'Civil';
          if (dept.name.toLowerCase().includes('elect')) return 'Electrical';
          if (dept.name.toLowerCase().includes('water')) return 'Water';
          return dept.name;
        })
        .filter(Boolean);

      const primaryAmc = contractorAmcs[0];

      return {
        ...c,
        id: c.id,
        name: c.company_name,
        company_name: c.company_name,
        lead: c.contact_person,
        contact_person: c.contact_person,
        phone: c.phone,
        email: c.email,
        departments: deptNames.length > 0 ? deptNames : ['General'],
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
    const departments = inMemoryDb.find('departments');
    res.status(200).json({ success: true, count: departments.length, data: departments });
  } catch (error) {
    next(error);
  }
};

export const getAmcRates = async (req, res, next) => {
  try {
    const rawRates = inMemoryDb.find('amc_rates');
    const amcs = inMemoryDb.find('amcs');
    const departments = inMemoryDb.find('departments');

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
    inMemoryDb.reset();
    res.status(200).json({ success: true, message: 'In-Memory database reset to initial seeds.' });
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
