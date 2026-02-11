export interface ElectronAPI {
  getConfig: () => Promise<AppConfig>
  setConfig: (config: Partial<AppConfig>) => Promise<{ success: boolean }>
  startWatcher: () => Promise<{ success: boolean }>
  stopWatcher: () => Promise<{ success: boolean }>
  getLogs: () => Promise<Log[]>
  onNewLog: (callback: (log: Log) => void) => void
  selectFolder: () => Promise<string | null>
  testApi: (apiUrl: string) => Promise<{ success: boolean; message: string }>
  // Gestión de contraseña
  hasAdminPassword: () => Promise<boolean>
  verifyAdminPassword: (password: string) => Promise<boolean>
  getAdminPassword: () => Promise<string | null>
  changeAdminPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>
  onShowInitialPassword: (callback: (password: string) => void) => void
  // SOLO DESARROLLO
  devResetPassword: () => Promise<{ success: boolean; message: string }>
}

export interface AppConfig {
  apiUrl: string
  watchPath: string
  processedPath: string
  rut: string
  autoStart: boolean
  watcherEnabled: boolean
}

export interface Log {
  id: number
  timestamp: string
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
