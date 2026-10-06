/**
 * TIMS React Stack Launcher
 * Starts Express Backend (port 5000) and Vite Frontend (port 5173) concurrently
 */

const { spawn } = require('child_process');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend-react');
const FRONTEND_DIR = path.join(__dirname, 'frontend-react');

console.log('===========================================================');
console.log('     🚀 TIMS (Township Infrastructure Management System)   ');
console.log('               React + Express.js + PostgreSQL             ');
console.log('===========================================================');

// 1. Launch Backend
console.log('▶ Starting Backend API (Express.js on port 5000)...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: BACKEND_DIR,
  stdio: 'inherit',
  shell: true,
});

// 2. Launch Frontend
console.log('▶ Starting Frontend (Vite on http://localhost:5173)...');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: FRONTEND_DIR,
  stdio: 'inherit',
  shell: true,
});

// Handle termination signals
const handleExit = () => {
  console.log('\n[Launcher] Shutting down backend and frontend processes...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
