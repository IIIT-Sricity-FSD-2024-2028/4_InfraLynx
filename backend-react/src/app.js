import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import config from './config/env.js';
import db from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/error.js';

const app = express();

// Ensure uploads directory exists
if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows React frontend to display uploaded images
  })
);

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
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);

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
