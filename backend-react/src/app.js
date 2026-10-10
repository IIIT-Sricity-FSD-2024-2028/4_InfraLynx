import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import config from './config/env.js';
import db from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import masterRoutes from './routes/masterRoutes.js';
import clerkRoutes from './routes/clerkRoutes.js';         // Member 2 — Desk Clerk
import workOrderRoutes from './routes/workOrderRoutes.js'; // Member 2 — Work Orders
import contractorRoutes from './routes/contractorRoutes.js'; // Member 3 — Field Contractor
import deptHeadRoutes from './routes/deptHeadRoutes.js';   // Member 4 — Dept Head
import financeRoutes from './routes/financeRoutes.js';     // Member 5 — Finance & AMC
import cooRoutes from './routes/cooRoutes.js';             // Executive — Township COO
import { errorHandler } from './middleware/error.js';

const app = express();

// Ensure uploads directory exists
if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

import { apiRateLimiter } from './middleware/rateLimiter.js';

// Security Headers (Clickjacking, MIME sniffing, and cross-origin protection)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows React frontend to display uploaded images
    frameguard: { action: 'deny' }, // Anti-clickjacking: Prevents embedding in iframes
    noSniff: true, // Prevents MIME-type sniffing
    xssFilter: true, // Legacy XSS browser filter
  })
);

// Apply sliding window rate limiter to API routes
app.use('/api/', apiRateLimiter);

// CORS Setup
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (config.corsOrigins.indexOf(origin) !== -1 || config.isDev) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request Logging
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// Standard Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static File Serving for Uploaded Documents & Evidence
app.use('/uploads', express.static(config.upload.dir));

// Healthcheck & System Info Endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await db.testConnection();
  const dbType = process.env.DB_MODE === 'postgres' ? 'POSTGRESQL' : 'IN_MEMORY_RAM';
  res.status(dbStatus ? 200 : 503).json({
    success: dbStatus,
    status: dbStatus ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: dbStatus ? `${dbType}_CONNECTED` : 'DISCONNECTED',
    mode: dbType,
  });
});

// Root API Information
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to TIMS (Township Infrastructure Management System) REST API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/health',
    routes: {
      auth:        '/api/v1/auth',
      complaints:  '/api/v1/complaints',   // Member 1 — RWA
      clerk:       '/api/v1/clerk',        // Member 2 — Desk Clerk
      workOrders:  '/api/v1/work-orders',  // Member 2 — Work Orders
      contractor:  '/api/v1/contractor',   // Member 3 — Field Contractor
      deptHead:    '/api/v1/dept-head',    // Member 4 — Department Head
      finance:     '/api/v1/finance',      // Member 5 — Finance & AMC
      coo:         '/api/v1/coo',          // Executive — Township COO
      master:      '/api/v1/master',       // Shared reference data
    },
  });
});

// -- API Routes --------------------------------------------------------------
app.use('/api/v1/auth',        authRoutes);
app.use('/api/v1/complaints',  complaintRoutes);   // Member 1 — RWA
app.use('/api/v1/clerk',       clerkRoutes);        // Member 2 — Desk Clerk
app.use('/api/v1/work-orders', workOrderRoutes);   // Member 2 — Work Orders
app.use('/api/v1/contractor',  contractorRoutes);   // Member 3 — Field Contractor
app.use('/api/v1/dept-head',   deptHeadRoutes);     // Member 4 — Department Head
app.use('/api/v1/finance',     financeRoutes);      // Member 5 — Finance & AMC
app.use('/api/v1/coo',         cooRoutes);          // Executive — Township COO
app.use('/api/v1/master',      masterRoutes);        // Shared reference data

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
      statusCode: 404,
    },
  });
});

// Global Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
