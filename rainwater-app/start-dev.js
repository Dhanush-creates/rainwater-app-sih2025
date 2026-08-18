#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Rainwater App Development Environment...\n');

// Start proxy server
console.log('📡 Starting proxy server...');
const proxy = spawn('node', ['proxy-server.js'], {
  cwd: __dirname,
  stdio: 'pipe'
});

proxy.stdout.on('data', (data) => {
  console.log(`[PROXY] ${data.toString().trim()}`);
});

proxy.stderr.on('data', (data) => {
  console.error(`[PROXY ERROR] ${data.toString().trim()}`);
});

// Wait a moment for proxy to start
setTimeout(() => {
  console.log('\n🌐 Starting development server...');
  
  // Start Vite dev server
  const dev = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true
  });

  dev.stdout.on('data', (data) => {
    console.log(`[DEV] ${data.toString().trim()}`);
  });

  dev.stderr.on('data', (data) => {
    console.error(`[DEV ERROR] ${data.toString().trim()}`);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    proxy.kill();
    dev.kill();
    process.exit(0);
  });

}, 2000);

console.log('💡 Both servers are starting...');
console.log('🔗 Proxy server: http://localhost:3001');
console.log('🌐 Dev server: http://localhost:5173');
console.log('📋 Press Ctrl+C to stop both servers\n');
