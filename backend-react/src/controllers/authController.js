import crypto from 'crypto';
import db from '../config/db.js';
import { comparePassword, generateToken, hashPassword } from '../utils/auth.js';

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
          township_id: user.township_id,
          township_name: user.township_name,
          department_id: user.department_id,
          department_name: user.department_name,
          contractor_id: user.contractor_id,
          contractor_name: user.contractor_name,
          sector: user.sector,
          phone: user.phone,
          status: user.status,
          townshipId: user.township_id,
          townshipName: user.township_name,
          departmentId: user.department_id,
          departmentName: user.department_name,
          contractorId: user.contractor_id,
          contractorName: user.contractor_name,
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




/**
 * @desc    Register a new Township & its Township COO account with default plan
 * @route   POST /api/v1/auth/register-township
 * @access  Public
 */
export const registerTownship = async (req, res, next) => {
  try {
    const {
      townshipName,
      executiveName,
      email,
      phone,
      address,
      password,
      planLabel = 'Enterprise Municipal Plan',
    } = req.body;

    // 1. Strict validation
    if (!townshipName || typeof townshipName !== 'string' || townshipName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: { message: 'Township name must be at least 3 characters long.', statusCode: 400 },
      });
    }

    const nameRegex = /^[a-zA-Z\s.'-]{3,60}$/;
    if (!executiveName || !nameRegex.test(executiveName.trim())) {
      return res.status(400).json({
        success: false,
        error: { message: 'Executive name must contain only letters and spaces (min 3 characters).', statusCode: 400 },
      });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email.trim()) || email.includes('..') || email.includes('@@')) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide a valid official email address.', statusCode: 400 },
      });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(String(phone).trim())) {
      return res.status(400).json({
        success: false,
        error: { message: 'Phone number must be a valid 10-digit mobile number starting with 6-9.', statusCode: 400 },
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character.',
          statusCode: 400,
        },
      });
    }

    // 2. Check duplicate email
    const existing = db.findOne('users', (u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'An account with this email address already exists. Please sign in.', statusCode: 409 },
      });
    }

    // 3. Create Township
    const townshipId = crypto.randomUUID();
    const cleanAddress = address?.trim() || `${townshipName.trim()}, Sector 1`;
    const newTownship = db.insert('townships', {
      id: townshipId,
      name: townshipName.trim(),
      address: cleanAddress,
      contact_email: email.trim(),
      contact_phone: String(phone).trim(),
      status: 'ACTIVE',
      subscription_plan_id: 'a0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
    });

    const oneYearLater = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    db.insert('tenant_subscriptions', {
      id: crypto.randomUUID(),
      township_id: townshipId,
      plan_id: 'a0000000-0000-0000-0000-000000000001',
      subscription_plan_id: 'a0000000-0000-0000-0000-000000000001',
      plan_label: 'Enterprise',
      billing_cycle: 'YEARLY',
      status: 'ACTIVE',
      start_date: new Date().toISOString(),
      expiry_date: oneYearLater,
      end_date: oneYearLater,
      primary_contact: executiveName.trim(),
      contact_email: email.trim(),
      contact_phone: String(phone).trim(),
      legal_entity: townshipName.trim(),
      max_users: 100,
      max_complaints_monthly: 500,
      max_storage_gb: 20,
    });

    // 4. Create standard 4 departments
    const defaultDepts = [
      { name: 'Civil Infrastructure & Roads', desc: 'Arterial asphalt roads, stormwater drains, footpaths.' },
      { name: 'Electrical & Power Systems', desc: 'Street lights, transformers, power distribution.' },
      { name: 'Water Supply & Drainage', desc: 'Water pipelines, booster pumps, sewer networks.' },
      { name: 'Horticulture & Public Grounds', desc: 'Parks, landscaping, tree maintenance.' },
    ];
    for (const d of defaultDepts) {
      db.insert('departments', {
        id: crypto.randomUUID(),
        township_id: townshipId,
        name: d.name,
        description: d.desc,
        department_head_id: null,
        status: 'ACTIVE',
      });
    }

    // 5. Create COO User
    const userId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);
    const username = email.trim().split('@')[0];

    const newUser = db.insert('users', {
      id: userId,
      township_id: townshipId,
      name: executiveName.trim(),
      email: email.trim(),
      username,
      password_hash: hashedPassword,
      role: 'TOWNSHIP_COO',
      department_id: null,
      contractor_id: null,
      sector: cleanAddress,
      phone: String(phone).trim(),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    });

    const userPayload = {
      id: userId,
      name: executiveName.trim(),
      email: email.trim(),
      username,
      role: 'TOWNSHIP_COO',
      townshipId,
      townshipName: townshipName.trim(),
      phone: String(phone).trim(),
    };

    const token = generateToken(userPayload);

    return res.status(201).json({
      success: true,
      message: 'Township and COO account registered successfully.',
      data: {
        token,
        user: userPayload,
        township: newTownship,
        credentials: {
          email: email.trim(),
          role: 'TOWNSHIP_COO',
          townshipName: townshipName.trim(),
        },
      },
    });
  } catch (error) {
    console.error('[Register Township Error]:', error);
    next(error);
  }
};

/**
 * @desc    Set or update password for user with strict validation
 * @route   POST /api/v1/auth/set-password
 * @access  Private
 */
export const setPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!newPassword || !passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character.',
          statusCode: 400,
        },
      });
    }

    const user = db.findById('users', req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.', statusCode: 404 },
      });
    }

    if (currentPassword) {
      const currentPasswordMatches = await comparePassword(currentPassword, user.password_hash);
      if (!currentPasswordMatches) {
        return res.status(401).json({
          success: false,
          error: { message: 'Current password is incorrect.', statusCode: 401 },
        });
      }
    }

    const hashedPassword = await hashPassword(newPassword);
    db.update('users', user.id, { password_hash: hashedPassword });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    console.error('[Set Password Error]:', error);
    next(error);
  }
};

export default {
  login,
  getMe,
  logout,
  registerTownship,
  setPassword,
};
