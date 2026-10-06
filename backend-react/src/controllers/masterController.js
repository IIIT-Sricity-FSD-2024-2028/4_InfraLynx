/**
 * TIMS Master Data Controller (In-Memory Engine)
 * Exposes reference data: Contractors, Departments, AMC Rate Cards, and DB Reset.
 */

import inMemoryDb from '../config/inMemoryDb.js';

export const getContractors = async (req, res, next) => {
  try {
    const contractors = inMemoryDb.find('contractors');
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
    const rates = inMemoryDb.find('amc_rates');
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
