import config from '../config/env.js';

/**
 * Custom Operational Application Error Class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async Handler wrapper to avoid repetitive try-catch blocks in Express controllers
 * @param {Function} fn - Async controller function (req, res, next)
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Maps Multer file upload errors
 */
const handleMulterError = (err) => {
  if (err.name === 'MulterError') {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return {
          statusCode: 400,
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds the allowed limit of ${config.upload.maxFileSize / (1024 * 1024)}MB.`,
        };
      case 'LIMIT_FILE_COUNT':
        return {
          statusCode: 400,
          code: 'TOO_MANY_FILES',
          message: 'Uploaded more files than permitted by this endpoint.',
        };
      case 'LIMIT_UNEXPECTED_FILE':
        return {
          statusCode: 400,
          code: 'UNEXPECTED_FILE_FIELD',
          message: `Unexpected upload field name: '${err.field}'.`,
        };
      default:
        return {
          statusCode: 400,
          code: 'FILE_UPLOAD_ERROR',
          message: err.message,
        };
    }
  }
  return null;
};

/**
 * Centralized Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal server error occurred.';

  // 1. Check for Multer File Upload Errors
  const multerError = handleMulterError(err);
  if (multerError) {
    statusCode = multerError.statusCode;
    code = multerError.code;
    message = multerError.message;
  }

  // 2. Check for JSON syntax parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Request body contains invalid JSON.';
  }

  // Log server errors for diagnostics
  if (statusCode >= 500) {
    console.error(`[Server Error 500] ${req.method} ${req.originalUrl}:`, err);
  } else if (config.isDev) {
    console.warn(`[Client Error ${statusCode}] ${req.method} ${req.originalUrl} - ${code}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      statusCode,
      ...(config.isDev && { stack: err.stack }),
    },
  });
};

export default errorHandler;
