<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Toast Notifications -->
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      <TransitionGroup name="toast">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="getNotificationClass(notification.type)"
          class="rounded-lg shadow-lg p-4 flex items-start space-x-3 border"
        >
          <!-- Icon -->
          <div class="flex-shrink-0">
            <svg v-if="notification.type === 'success'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else-if="notification.type === 'error'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else-if="notification.type === 'warning'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm">{{ notification.message }}</p>
          </div>

          <!-- Close button -->
          <button
            @click="removeNotification(notification.id)"
            class="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>

    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-slate-200">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm border border-slate-200">
              <img src="/assets/icon.png" alt="iGlobal" class="w-full h-full object-contain" @error="handleLogoError" />
            </div>
            <div>
              <h1 class="text-xl font-bold text-slate-800">iGlobal DTE</h1>
              <p class="text-sm text-slate-500">Sistema de Gestión de Documentos Tributarios</p>
            </div>
          </div>

          <div class="flex items-center space-x-4">
            <!-- Estado del Watcher -->
            <div class="flex items-center space-x-2">
              <div :class="watcherEnabled ? 'bg-green-500' : 'bg-gray-400'" class="w-2 h-2 rounded-full animate-pulse"></div>
              <span class="text-sm font-medium text-slate-600">
                {{ watcherEnabled ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <!-- Botón toggle watcher -->
            <button
              @click="toggleWatcher"
              :class="watcherEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'"
              class="px-4 py-2 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg v-if="!watcherEnabled" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              <span>{{ watcherEnabled ? 'Detener' : 'Iniciar' }}</span>
            </button>

            <button
              @click="activeTab = 'settings'"
              class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="border-b border-slate-200 bg-white">
      <nav class="px-6 flex space-x-8">
        <button
          @click="activeTab = 'dashboard'"
          :class="activeTab === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
        >
          Dashboard
        </button>
        <button
          @click="activeTab = 'logs'"
          :class="activeTab === 'logs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
        >
          Logs
        </button>
        <button
          @click="activeTab = 'settings'"
          :class="activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
        >
          Configuración
        </button>
      </nav>
    </div>

    <!-- Content -->
    <main class="p-6">
      <!-- Dashboard Tab -->
      <div v-if="activeTab === 'dashboard'" class="slide-up space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Card: Estado -->
          <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500">Estado</p>
                <p class="text-2xl font-bold text-slate-800 mt-1">
                  {{ watcherEnabled ? 'Activo' : 'Detenido' }}
                </p>
              </div>
              <div :class="watcherEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'" class="w-12 h-12 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="6" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Card: Carpeta monitoreada -->
          <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:col-span-2">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-500">Carpeta Monitoreada</p>
                <p class="text-sm font-mono text-slate-800 mt-1 truncate">{{ config.watchPath }}</p>
              </div>
              <div class="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ml-4">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Logs recientes -->
        <div class="bg-white rounded-lg shadow-sm border border-slate-200">
          <div class="px-6 py-4 border-b border-slate-200">
            <h2 class="text-lg font-semibold text-slate-800">Actividad Reciente</h2>
          </div>
          <div class="p-6">
            <div v-if="logs.length === 0" class="text-center py-12 text-slate-400">
              <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-lg font-medium">No hay actividad aún</p>
              <p class="text-sm mt-1">Los logs aparecerán aquí cuando se procesen archivos</p>
            </div>
            <div v-else class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="log in logs.slice(0, 10)"
                :key="log.id"
                class="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div :class="getLogIconClass(log.type)" class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="5" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-slate-800">{{ log.message }}</p>
                  <p class="text-xs text-slate-500 mt-1">{{ formatTime(log.timestamp) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs Tab -->
      <div v-if="activeTab === 'logs'" class="slide-up">
        <LogsView :logs="logs" />
      </div>

      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="slide-up">
        <SettingsView :config="config" @update="updateConfig" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LogsView from './components/LogsView.vue'
import SettingsView from './components/SettingsView.vue'

const activeTab = ref('dashboard')
const watcherEnabled = ref(false)
const logs = ref<any[]>([])
const config = ref({
  apiUrl: '',
  watchPath: '',
  processedPath: '',
  failedPath: '',
  pngPath: '',
  rut: '',
  autoStart: true,
  generatePDF417: true,
  emailNotifications: false,
  emailTo: '',
  emailFrom: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: ''
})

// Sistema de notificaciones
interface Notification {
  id: number
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
}

const notifications = ref<Notification[]>([])
let notificationId = 0

function showNotification(type: Notification['type'], message: string) {
  const id = ++notificationId
  notifications.value.push({ id, type, message })

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    removeNotification(id)
  }, 5000)
}

function removeNotification(id: number) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

function getNotificationClass(type: string) {
  switch (type) {
    case 'success':
      return 'bg-green-50 text-green-800 border-green-200'
    case 'error':
      return 'bg-red-50 text-red-800 border-red-200'
    case 'warning':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200'
    default:
      return 'bg-blue-50 text-blue-800 border-blue-200'
  }
}

// Cargar configuración
onMounted(async () => {
  const configData = await window.electronAPI.getConfig()
  config.value = configData
  watcherEnabled.value = configData.watcherEnabled

  // Cargar logs
  const logsData = await window.electronAPI.getLogs()
  logs.value = logsData

  // Escuchar nuevos logs
  window.electronAPI.onNewLog((log: any) => {
    logs.value.unshift(log)
    if (logs.value.length > 100) {
      logs.value = logs.value.slice(0, 100)
    }

    // Mostrar notificación para errores y warnings
    if (log.type === 'error') {
      showNotification('error', log.message)
    } else if (log.type === 'warning') {
      showNotification('warning', log.message)
    } else if (log.type === 'success' && log.message.includes('exitosamente')) {
      showNotification('success', log.message)
    }
  })

  // Escuchar cambios de estado del watcher desde el system tray
  window.electronAPI.onWatcherStatusChanged((isActive: boolean) => {
    watcherEnabled.value = isActive
  })
})

// Toggle watcher
async function toggleWatcher() {
  if (watcherEnabled.value) {
    const result = await window.electronAPI.stopWatcher()
    if (result.success) {
      watcherEnabled.value = false
      showNotification('info', 'Monitoreo detenido')
    }
  } else {
    // Validar que el RUT esté configurado antes de permitir iniciar
    if (!config.value.rut || config.value.rut.trim() === '') {
      showNotification('error', 'Debes configurar el RUT de la empresa antes de iniciar')
      activeTab.value = 'settings'
      return
    }

    const result = await window.electronAPI.startWatcher()
    if (result.success) {
      watcherEnabled.value = true
      showNotification('success', 'Monitoreo iniciado correctamente')
    } else {
      showNotification('error', 'No se pudo iniciar el monitoreo. Verifica la configuración.')
    }
  }
}

// Actualizar configuración
async function updateConfig(newConfig: any) {
  config.value = { ...config.value, ...newConfig }
  // Convertir a objeto plano para evitar problemas de clonación con IPC
  const plainConfig = JSON.parse(JSON.stringify(config.value))
  await window.electronAPI.setConfig(plainConfig)
  showNotification('success', 'Configuración guardada correctamente')
}

// Formatear timestamp
function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleString('es-CL')
}

// Clases para iconos de log
function getLogIconClass(type: string) {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-600'
    case 'error':
      return 'bg-red-100 text-red-600'
    case 'warning':
      return 'bg-yellow-100 text-yellow-600'
    default:
      return 'bg-primary-100 text-primary-600'
  }
}

// Fallback si el logo no carga
function handleLogoError(event: Event) {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
  const parent = target.parentElement
  if (parent) {
    parent.innerHTML = `
      <svg class="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    `
  }
}
</script>

<style scoped>
/* Toast animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100px) scale(0.9);
}
</style>
