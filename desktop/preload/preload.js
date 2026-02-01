const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cleanium', {
  startScan: (options) => ipcRenderer.invoke('scan:start', options),
  stopScan: () => ipcRenderer.invoke('scan:stop'),
  onScanProgress: (fn) => {
    ipcRenderer.on('scan:progress', (_, data) => fn(data));
  },
  offScanProgress: () => ipcRenderer.removeAllListeners('scan:progress'),
  deletePath: (targetPath, useTrash = true, dockerType, dockerId) =>
    ipcRenderer.invoke('delete:path', targetPath, useTrash, dockerType, dockerId),
  getDefaultRoots: () => ipcRenderer.invoke('scan:defaultRoots'),
  getScans: () => ipcRenderer.invoke('db:getScans'),
  getFindings: (scanId) => ipcRenderer.invoke('db:getFindings', scanId),
  deleteScan: (scanId) => ipcRenderer.invoke('db:deleteScan', scanId),
  exportResults: (data) => ipcRenderer.invoke('export:save', data),
});
