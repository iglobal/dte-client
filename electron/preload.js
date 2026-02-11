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
  syncEmpresa: () => ipcRenderer.invoke('sync-empresa'),
  uploadPending: () => ipcRenderer.invoke('upload-pending'),

  // Gestión de contraseña de administrador
  hasAdminPassword: () => ipcRenderer.invoke('has-admin-password'),
  verifyAdminPassword: (password) => ipcRenderer.invoke('verify-admin-password', password),
  getAdminPassword: () => ipcRenderer.invoke('get-admin-password'),
  changeAdminPassword: (currentPassword, newPassword) => ipcRenderer.invoke('change-admin-password', currentPassword, newPassword),
  onShowInitialPassword: (callback) => {
    ipcRenderer.on('show-initial-password', (event, password) => callback(password))
  },

  // SOLO DESARROLLO: Resetear contraseña
  devResetPassword: () => ipcRenderer.invoke('dev-reset-password')
})
