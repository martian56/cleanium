const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { startScan, deletePath } = require('./src/lib/scanner');
const { getDockerFindings, removeDockerItem } = require('./src/lib/docker-api');
const db = require('./src/lib/db');

let mainWindow;
let scanAbortRef = { aborted: false };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0d1117',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  db.init();
  createWindow();
});

app.on('window-all-closed', () => app.quit());

// IPC: start scan (drives or custom path); streams progress, then syncs to SQLite
ipcMain.handle('scan:start', async (_, options = {}) => {
  const { rootPaths, includeHidden } = options;
  scanAbortRef.aborted = false;
  const startTime = Date.now();
  const stream = startScan(rootPaths, includeHidden, scanAbortRef);
  const results = [];
  for await (const item of stream) {
    results.push(item);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan:progress', { item, total: results.length });
    }
  }
  // Merge Docker API findings (dockerode) when daemon is available
  try {
    const dockerFindings = await getDockerFindings();
    for (const item of dockerFindings) {
      results.push(item);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('scan:progress', { item, total: results.length });
      }
    }
  } catch (_) {
    // Docker not running or not installed – ignore
  }
  const durationMs = Date.now() - startTime;
  const stopped = scanAbortRef.aborted;
  if (results.length > 0) {
    db.insertScan(rootPaths || [], results, durationMs);
  }
  return { results, durationMs, stopped };
});

// IPC: stop current scan
ipcMain.handle('scan:stop', () => {
  scanAbortRef.aborted = true;
});

// IPC: delete path (move to trash) or Docker resource (by type/id)
ipcMain.handle('delete:path', async (_, targetPath, useTrash = true, dockerType, dockerId) => {
  if (dockerType && dockerId) {
    await removeDockerItem(dockerType, dockerId);
    return { deleted: true, docker: true };
  }
  return deletePath(targetPath, useTrash);
});

// IPC: get default scan roots (e.g. user home, common dev locations)
ipcMain.handle('scan:defaultRoots', () => {
  const os = require('os');
  const roots = [];
  const home = os.homedir();
  roots.push(home);
  if (process.env.USERPROFILE && process.env.USERPROFILE !== home) {
    roots.push(process.env.USERPROFILE);
  }
  return [...new Set(roots)];
});

// IPC: scan history (SQLite)
ipcMain.handle('db:getScans', () => db.getScans());
ipcMain.handle('db:getFindings', (_, scanId) => db.getFindings(scanId));
ipcMain.handle('db:deleteScan', (_, scanId) => {
  db.deleteScan(scanId);
  return { deleted: true };
});

// IPC: export results to JSON file
ipcMain.handle('export:save', async (_, data) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { canceled: true };
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export scan results',
    defaultPath: `cleanium-scan-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return { canceled: false, filePath };
});
