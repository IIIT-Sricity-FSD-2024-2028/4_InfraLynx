import app from './src/app.js';
import config from './src/config/env.js';
import db from './src/config/db.js';

const PORT = config.port || 5000;

const startServer = async () => {
  try {
    console.log('---------------------------------------------------------');
    console.log('  TIMS Backend API Server (Express + In-Memory Engine)   ');
    console.log('---------------------------------------------------------');
    console.log(`[Config] Environment: ${config.nodeEnv}`);
    console.log(`[Config] Port: ${PORT}`);
    console.log(`[Config] Database Engine: 100% In-Memory RAM Store (Zero-Install)`);
    console.log(`[Config] Upload Directory: ${config.upload.dir}`);
    console.log('---------------------------------------------------------');

    // Confirm In-Memory DB connection
    await db.testConnection();

    const server = app.listen(PORT, () => {
      console.log(`🚀 [Server] Listening on http://localhost:${PORT}`);
      console.log(`🔗 [Healthcheck] http://localhost:${PORT}/health`);
    });

    // Graceful Shutdown Handlers
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] ${signal} signal received. Closing HTTP server...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        await db.closePool();
        process.exit(0);
      });

      // Force close after 5s if graceful close hangs
      setTimeout(() => {
        console.error('[Server] Forcefully terminating server.');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ [Fatal] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
