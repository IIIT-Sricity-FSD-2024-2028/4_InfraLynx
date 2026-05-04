/**
 * InfraLynx Dev Launcher
 * Starts backend (NestJS on port 3000) and serves frontend (port 3001)
 * using ONLY Node.js built-ins — zero extra packages needed.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BACKEND_PORT = Number(process.env.BACKEND_PORT || 3000);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3001);
const FRONTEND_DIR = path.join(__dirname, 'front-end');

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// ── Frontend static server ────────────────────────────────────────────────────
const frontendServer = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(FRONTEND_DIR, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for SPA-style routing
      fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data2);
        }
      });
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

frontendServer.listen(FRONTEND_PORT, () => {
  console.log(`\x1b[36m[Frontend]\x1b[0m  ✓ Serving front-end at http://localhost:${FRONTEND_PORT}`);
});

frontendServer.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      `\x1b[31m[Frontend]\x1b[0m  Port ${FRONTEND_PORT} is already in use. Stop the existing process or run with FRONTEND_PORT=<port>.`,
    );
    process.exit(1);
  }
  console.error(`\x1b[31m[Frontend]\x1b[0m  Failed to start: ${err.message}`);
  process.exit(1);
});

// ── Backend (NestJS) process ──────────────────────────────────────────────────
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const backendScript = process.env.BACKEND_WATCH === '1' ? 'start:dev' : 'start';
const backend = spawn(npmCmd, ['run', backendScript], {
  cwd: path.join(__dirname, 'back-end'),
  stdio: 'inherit',
  shell: true,
});

backend.on('error', (err) => {
  console.error(`\x1b[31m[Backend]\x1b[0m  ✗ Failed to start: ${err.message}`);
});

backend.on('close', (code) => {
  if (code !== 0) {
    console.error(`\x1b[31m[Backend]\x1b[0m  ✗ Exited with code ${code}`);
  }
  process.exit(code);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n\x1b[33m[Launcher]\x1b[0m Shutting down...');
  frontendServer.close();
  backend.kill('SIGINT');
  process.exit(0);
});

console.log('\x1b[33m[Launcher]\x1b[0m Starting InfraLynx CRIMS... (Ctrl+C to stop)\n');
