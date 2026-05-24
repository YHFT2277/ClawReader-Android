// scripts/fix-electron.js
// 修复 node_modules/electron 劫持 require('electron') 的问题
// 在 npm install 后自动运行

const fs = require('fs');
const path = require('path');

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron');
const backupDir = path.join(__dirname, '..', 'node_modules', '_electron_bak');

if (fs.existsSync(electronDir)) {
  try {
    // 把整个 electron 目录重命名，让 require('electron') 找不到它
    if (!fs.existsSync(backupDir)) {
      fs.renameSync(electronDir, backupDir);
      console.log('[postinstall] Renamed node_modules/electron to _electron_bak');
      console.log('[postinstall] require("electron") in main process will now use built-in module.');
    } else {
      // backup 已存在，直接删掉 electron 目录
      fs.rmSync(electronDir, { recursive: true, force: true });
      console.log('[postinstall] Removed node_modules/electron (backup already exists)');
    }
  } catch (e) {
    console.log('[postinstall] Could not rename electron:', e.message);
  }
}
