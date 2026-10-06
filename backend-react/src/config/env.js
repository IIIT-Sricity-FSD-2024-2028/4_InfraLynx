import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend-react root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Database mode: 100% In-Memory RAM Store
  dbMode: 'IN_MEMORY',

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'tims_super_secret_jwt_key_development_only_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Upload configuration
  upload: {
    dir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024, // in bytes
  },

  // CORS origins
  corsOrigins: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'],
};

export default config;
