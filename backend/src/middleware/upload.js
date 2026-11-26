import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import config from '../config/env.js';
import { AppError } from './error.js';

// Ensure upload destination folder exists
if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

// Allowed image MIME types for complaint photos and work evidence.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Configure Disk Storage with sanitized unique file names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

// File type filter
const fileFilter = (req, file, cb) => {
  const mimetype = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Unsupported file type '${file.mimetype}'. Allowed image types: JPG, PNG, WEBP.`,
        400,
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
};

const hasAllowedImageSignature = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 12) return false;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  return isJpeg || isPng || isWebp;
};

const normalizeFiles = (req) => {
  if (!req.files) return req.file ? [req.file] : [];
  if (Array.isArray(req.files)) return req.files;
  return Object.values(req.files).flat();
};

export const validateUploadedImages = (req, res, next) => {
  try {
    const files = normalizeFiles(req);
    for (const file of files) {
      if (!hasAllowedImageSignature(file.path)) {
        fs.unlink(file.path, () => {});
        return next(new AppError('Uploaded file content does not match an allowed image format.', 400, 'INVALID_FILE_SIGNATURE'));
      }
    }
    next();
  } catch (error) {
    next(error);
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
export const uploadSingle = (fieldName = 'file') => [upload.single(fieldName), validateUploadedImages];

/**
 * Middleware helper for multiple file uploads under the same field
 * @param {string} fieldName - Form field name (e.g., 'images', 'proof')
 * @param {number} maxCount - Max files (default 5)
 */
export const uploadArray = (fieldName = 'images', maxCount = 5) => [upload.array(fieldName, maxCount), validateUploadedImages];

/**
 * Middleware helper for multiple fields with different names
 * @param {Array<{ name: string, maxCount: number }>} fields
 */
export const uploadFields = (fields) => [upload.fields(fields), validateUploadedImages];

export default {
  upload,
  uploadSingle,
  uploadArray,
  uploadFields,
  validateUploadedImages,
};
