const { contextBridge, ipcRenderer } = require('electron')

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuración
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),

  // Watcher
  startWatcher: () => ipcRenderer.invoke('start-watcher'),
  stopWatcher: () => ipcRenderer.invoke('stop-watcher'),

  // Logs
  getLogs: () => ipcRenderer.invoke('get-logs'),
  onNewLog: (callback) => {
    ipcRenderer.on('new-log', (event, log) => callback(log))
  },

  // Eventos de estado
  onWatcherStatusChanged: (callback) => {
    ipcRenderer.on('watcher-status-changed', (event, isActive) => callback(isActive))
  },

  // Utilidades
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  testApi: (apiUrl) => ipcRenderer.invoke('test-api', apiUrl),
  testMysql: (config) => ipcRenderer.invoke('test-mysql', config),

  // CAF y subida de archivos
  syncCAF: () => ipcRenderer.invoke('sync-caf'),
  uploadPending: () => ipcRenderer.invoke('upload-pending')
})
