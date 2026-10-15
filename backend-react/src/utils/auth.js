import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Salted hash
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Compare plain text password with stored bcrypt hash
 * @param {string} password - Plain text candidate password
 * @param {string} hash - Stored bcrypt hash
 * @returns {Promise<boolean>} True if matched
 */
export const comparePassword = async (password, hash) => {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
};

/**
 * Generate a signed JWT token containing user identity and authorization claims
 * @param {Object} user - User payload
 * @returns {string} Signed JWT string
 */
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    township_id: user.township_id,
    department_id: user.department_id || null,
    contractor_id: user.contractor_id || null,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - Bearer token
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
};

export default {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
