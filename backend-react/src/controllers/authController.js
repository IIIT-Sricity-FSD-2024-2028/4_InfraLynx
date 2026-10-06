import db from '../config/db.js';
import { comparePassword, generateToken } from '../utils/auth.js';

/**
 * @desc    Authenticate user & get JWT token
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const identifier = email || username;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide email or username, and password.',
          statusCode: 400,
        },
      });
    }

    // Find user by email or username (case-insensitive)
    const queryText = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.username, 
        u.password_hash,
        u.role, 
        u.township_id, 
        u.department_id, 
        u.contractor_id, 
        u.phone, 
        u.sector, 
        u.status,
        t.name AS township_name,
        d.name AS department_name,
        c.company_name AS contractor_name
      FROM users u
      LEFT JOIN townships t ON u.township_id = t.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN contractors c ON u.contractor_id = c.id
      WHERE LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1)
      LIMIT 1
    `;

    const result = await db.query(queryText, [identifier.trim()]);

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials. User not found.',
          statusCode: 401,
        },
      });
    }

    const user = result.rows[0];

    // Check account status
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          message: `Account is ${user.status}. Please contact your administrator.`,
          statusCode: 403,
        },
      });
    }

    // Compare passwords using bcrypt
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials. Password incorrect.',
          statusCode: 401,
        },
      });
    }

    // Update last_login_at timestamp
    await db.query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);

    // Generate JWT Token
    const token = generateToken(user);

    // Return response without sensitive password_hash
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          townshipId: user.township_id,
          townshipName: user.township_name,
          departmentId: user.department_id,
          departmentName: user.department_name,
          contractorId: user.contractor_id,
          contractorName: user.contractor_name,
          sector: user.sector,
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user profile
 * @route   GET /api/v1/auth/me
 * @access  Private (Authenticated)
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user is populated by authenticate middleware
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (Session invalidation response)
 * @route   POST /api/v1/auth/logout
 * @access  Private (Authenticated)
 */
export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User logged out successfully.',
  });
};

export default {
  login,
  getMe,
  logout,
};
