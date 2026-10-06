import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config/env.js';
import { AppError } from './error.js';

// Ensure upload destination folder exists
if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

// Allowed MIME types for complaint images, completion evidence, and PDF invoices/contracts
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

// Configure Disk Storage with sanitized unique file names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 40);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

// File type filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Unsupported file type '${file.mimetype}'. Allowed types: JPG, PNG, WEBP, GIF, PDF.`,
        400,
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
};

// Base Multer Instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize, // 10MB default
  },
});

/**
 * Middleware helper for a single file upload
 * @param {string} fieldName - Form field name
 */
export const uploadSingle = (fieldName = 'file') => upload.single(fieldName);

/**
 * Middleware helper for multiple file uploads under the same field
 * @param {string} fieldName - Form field name (e.g., 'images', 'proof')
 * @param {number} maxCount - Max files (default 5)
 */
export const uploadArray = (fieldName = 'images', maxCount = 5) => upload.array(fieldName, maxCount);

/**
 * Middleware helper for multiple fields with different names
 * @param {Array<{ name: string, maxCount: number }>} fields
 */
export const uploadFields = (fields) => upload.fields(fields);

export default {
  upload,
  uploadSingle,
  uploadArray,
  uploadFields,
};
