/**
 * wait-vite.js
 * Wait for Vite dev server to be ready, then launch Electron.
 * Used by: npm run dev:electron
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const VITE_URL = 'http://localhost:5174';
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 1000;

const projectRoot = path.join(__dirname, '..');
let settled = false;

function checkVite(retry) {
  retry = retry || 0;
  if (settled) return;

  const req = http.get(VITE_URL, function(res) {
    if (settled) return;
    settled = true;
    console.log('✅ Vite dev server is ready.');
    launchElectron();
  });

  req.on('error', function() {
    if (settled) return;
    if (retry >= MAX_RETRIES) {
      console.error('❌ Vite dev server did not start in time.');
      process.exit(1);
    }
    console.log('⏳ Waiting for Vite dev server... (' + (retry + 1) + '/' + MAX_RETRIES + ')');
    setTimeout(function() {
      checkVite(retry + 1);
    }, RETRY_DELAY_MS);
  });

  req.end();
}

function findElectronPath() {
  // electron 包被重命名为 _electron_bak，二进制在 _electron_bak/dist/electron.exe
  const bakDir = path.join(projectRoot, 'node_modules', '_electron_bak');
  const candidates = [
    path.join(bakDir, 'dist', 'electron.exe'),
    path.join(projectRoot, 'node_modules', '.bin', 'electron.cmd'),
    'electron',
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) {
      return candidates[i];
    }
  }
  return 'electron';
}

function launchElectron() {
  var electronPath = findElectronPath();
  // quote paths with spaces to avoid shell splitting
  var quotedPath = electronPath.includes(' ') ? '"' + electronPath + '"' : electronPath;
  var quotedRoot = projectRoot.includes(' ') ? '"' + projectRoot + '"' : projectRoot;
  console.log('🚀 Launching Electron from: ' + electronPath);

  var child = spawn(quotedPath, [quotedRoot, '--dev'], {
    stdio: 'inherit',
    shell: true,
    env: Object.assign({}, process.env, { ELECTRON_IS_DEV: '1' })
  });

  child.on('close', function(code) {
    console.log('Electron exited with code ' + code);
    process.exit(code || 0);
  });

  child.on('error', function(err) {
    console.error('Failed to start Electron:', err.message);
    process.exit(1);
  });
}

checkVite();
