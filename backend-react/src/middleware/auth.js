import { verifyToken } from '../utils/auth.js';
import db from '../config/db.js';

/**
 * Authentication Middleware
 * Extracts Bearer token from Authorization header, validates JWT,
 * verifies active status in PostgreSQL, and attaches req.user.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required. No Bearer token provided in Authorization header.',
          statusCode: 401,
        },
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication token has expired. Please log in again.',
            code: 'TOKEN_EXPIRED',
            statusCode: 401,
          },
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid authentication token.',
          code: 'INVALID_TOKEN',
          statusCode: 401,
        },
      });
    }

    // Query database to ensure user still exists and is ACTIVE
    const userQuery = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.username, 
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
      WHERE u.id = $1
    `;

    const result = await db.query(userQuery, [decoded.id]);

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User belonging to this token no longer exists.',
          statusCode: 401,
        },
      });
    }

    const user = result.rows[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          message: `User account is currently ${user.status}. Please contact the Department Head or Township COO.`,
          statusCode: 403,
        },
      });
    }

    // Attach normalized user payload to request
    req.user = {
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
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string|string[]} allowedRoles - List of permitted roles (e.g. 'RWA', 'DESK_CLERK')
 */
export const requireRole = (...allowedRoles) => {
  const flattenedRoles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: Authentication required before checking permissions.',
          statusCode: 401,
        },
      });
    }

    if (!flattenedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required one of: [${flattenedRoles.join(', ')}]`,
          statusCode: 403,
        },
      });
    }

    next();
  };
};

/**
 * Multi-Township Isolation Middleware
 * Enforces that operations targeting a specific township belong to the authenticated user's township.
 * Extracts target township ID from params, query, or body.
 */
export const requireTownship = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized: Authentication required.',
        statusCode: 401,
      },
    });
  }

  // Check possible locations for target townshipId
  const targetTownshipId =
    req.params.townshipId ||
    req.params.township_id ||
    req.query.townshipId ||
    req.query.township_id ||
    req.body.townshipId ||
    req.body.township_id;

  if (targetTownshipId && targetTownshipId !== req.user.townshipId) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Cross-Township Access Forbidden: You cannot access or modify resources in a different township.',
        statusCode: 403,
      },
    });
  }

  next();
};

export default {
  authenticate,
  requireRole,
  requireTownship,
};
