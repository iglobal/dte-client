<template>
  <div class="max-w-5xl mx-auto max-h-[calc(100vh-220px)] overflow-y-auto">
    <div class="bg-white rounded-lg shadow-sm border border-slate-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-800">Configuración</h2>
          <div class="flex space-x-2">
            <button
              @click="resetToDefaults"
              class="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Restaurar Valores por Defecto
            </button>
            <button
              @click="saveConfig"
              class="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
        <div v-if="showSaveMessage" class="mt-2 text-sm text-green-600 animate-fade-in">
          ✓ Configuración guardada exitosamente
        </div>
      </div>

      <!-- Secciones Colapsables -->
      <div class="divide-y divide-slate-200">

        <!-- 1. Conexión al API -->
        <CollapsibleSection
          title="Conexión al API"
          subtitle="URL del servidor Laravel y token de autenticación"
          icon="🔗"
          :default-open="true"
        >
          <div class="space-y-4">
            <!-- URL del API -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                URL del API Laravel
              </label>
              <div class="flex space-x-2">
                <input
                  v-model="localConfig.apiUrl"
                  type="text"
                  placeholder="http://localhost:8000/api/v1/documentos"
                  class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  @click="testApiConnection"
                  :disabled="testingApi"
                  class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-primary-300 transition-colors flex items-center space-x-2"
                >
                  <svg v-if="!testingApi" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ testingApi ? 'Probando...' : 'Probar' }}</span>
                </button>
              </div>
              <p v-if="apiTestResult" :class="apiTestResult.success ? 'text-green-600' : 'text-red-600'" class="text-sm mt-2">
                {{ apiTestResult.message }}
              </p>
            </div>

            <!-- Bearer Token -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Bearer Token (64 caracteres)
              </label>
              <input
                v-model="localConfig.apiToken"
                type="password"
                placeholder="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4"
                maxlength="64"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <p class="text-sm text-slate-500 mt-2">
                Token de autenticación generado desde el panel admin de Laravel
              </p>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 2. Rutas y Archivos -->
        <CollapsibleSection
          title="Rutas y Archivos"
          subtitle="Configuración de carpetas y RUT de empresa"
          icon="📁"
        >
          <div class="space-y-4">
            <!-- RUT Empresa -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                RUT Empresa (sin puntos, con guión)
              </label>
              <input
                v-model="localConfig.rut"
                type="text"
                placeholder="76123456-7"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p class="text-sm text-slate-500 mt-2">
                Las carpetas se crearán automáticamente en: <code class="bg-slate-100 px-2 py-1 rounded">{{ localConfig.basePath }}\{{ localConfig.rut || 'RUT_EMPRESA' }}</code>
              </p>
            </div>

            <!-- Ruta Base -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Ruta Base de Archivos
              </label>
              <div class="flex space-x-2">
                <input
                  v-model="localConfig.basePath"
                  type="text"
                  placeholder="C:\iGlobal\DTE"
                  class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  @click="selectBaseFolder"
                  class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center space-x-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Buscar</span>
                </button>
              </div>
              <p class="text-sm text-slate-500 mt-2">
                Carpeta principal donde se encuentran organizadas las empresas por RUT
              </p>
            </div>

            <!-- Opciones -->
            <div class="space-y-3">
              <label class="flex items-center space-x-3 cursor-pointer">
                <input
                  v-model="localConfig.autoStart"
                  type="checkbox"
                  class="w-5 h-5 text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span class="text-sm text-slate-700">Iniciar monitoreo automáticamente al abrir la aplicación</span>
              </label>

              <label class="flex items-center space-x-3 cursor-pointer">
                <input
                  v-model="localConfig.generatePDF417"
                  type="checkbox"
                  class="w-5 h-5 text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span class="text-sm text-slate-700">Generar códigos de barras PDF417 automáticamente</span>
              </label>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 3. Intervalos y Tiempos -->
        <CollapsibleSection
          title="Intervalos y Tiempos"
          subtitle="Configuración de procesos automáticos"
          icon="⏱️"
        >
          <div class="space-y-4">
            <!-- Intervalo de Subida -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Intervalo de Subida de Documentos
              </label>
              <div class="flex items-center space-x-4">
                <input
                  v-model.number="localConfig.uploadInterval"
                  type="number"
                  min="5000"
                  step="1000"
                  class="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span class="text-sm text-slate-600">milisegundos ({{ (localConfig.uploadInterval / 1000).toFixed(0) }} segundos)</span>
              </div>
              <p class="text-sm text-slate-500 mt-2">
                Frecuencia con la que se intentan subir documentos desde la carpeta PENDING
              </p>
            </div>

            <!-- Intervalo de Sincronización CAF -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Intervalo de Sincronización de CAF
              </label>
              <div class="flex items-center space-x-4">
                <input
                  v-model.number="localConfig.cafSyncInterval"
                  type="number"
                  min="60000"
                  step="60000"
                  class="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span class="text-sm text-slate-600">
                  milisegundos
                  <template v-if="localConfig.cafSyncInterval >= 60000">
                    ({{ (localConfig.cafSyncInterval / 60000).toFixed(1) }} minutos)
                  </template>
                  <template v-else>
                    ({{ (localConfig.cafSyncInterval / 1000).toFixed(0) }} segundos)
                  </template>
                </span>
              </div>
              <p class="text-sm text-slate-500 mt-2">
                Frecuencia con la que se descargan nuevos CAFs desde el servidor (recomendado: 60 minutos)
              </p>
            </div>

            <!-- Reintentos -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Número Máximo de Reintentos
              </label>
              <div class="flex items-center space-x-4">
                <input
                  v-model.number="localConfig.maxRetries"
                  type="number"
                  min="1"
                  max="10"
                  class="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span class="text-sm text-slate-600">intentos</span>
              </div>
              <p class="text-sm text-slate-500 mt-2">
                Cantidad de reintentos antes de mover un documento a FALLIDOS
              </p>
            </div>

            <!-- Delay de Reintentos -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Tiempo de Espera entre Reintentos
              </label>
              <div class="flex items-center space-x-4">
                <input
                  v-model.number="localConfig.retryDelay"
                  type="number"
                  min="1000"
                  step="1000"
                  class="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span class="text-sm text-slate-600">milisegundos ({{ (localConfig.retryDelay / 1000).toFixed(0) }} segundos)</span>
              </div>
              <p class="text-sm text-slate-500 mt-2">
                Tiempo de espera antes de reintentar subir un documento fallido
              </p>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 4. Base de Datos MySQL -->
        <CollapsibleSection
          title="Base de Datos MySQL (ERP)"
          subtitle="Conexión a la base de datos local para CAF"
          icon="🗄️"
        >
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- MySQL Host -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  Host
                </label>
                <input
                  v-model="localConfig.mysqlHost"
                  type="text"
                  placeholder="localhost"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <!-- MySQL Port -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  Puerto
                </label>
                <input
                  v-model.number="localConfig.mysqlPort"
                  type="number"
                  placeholder="3306"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <!-- MySQL User -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  Usuario
                </label>
                <input
                  v-model="localConfig.mysqlUser"
                  type="text"
                  placeholder="root"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <!-- MySQL Password -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña
                </label>
                <input
                  v-model="localConfig.mysqlPassword"
                  type="password"
                  placeholder="••••••••"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <!-- MySQL Database -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Base de Datos
              </label>
              <input
                v-model="localConfig.mysqlDatabase"
                type="text"
                placeholder="iglobal_dte"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <!-- Test Connection Button -->
            <div class="flex items-center space-x-2">
              <button
                @click="testMysqlConnection"
                :disabled="testingMysql"
                class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-primary-300 transition-colors flex items-center space-x-2"
              >
                <svg v-if="!testingMysql" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ testingMysql ? 'Probando...' : 'Probar Conexión' }}</span>
              </button>
              <button
                @click="syncEmpresa"
                :disabled="syncingEmpresa"
                class="px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 disabled:bg-secondary-300 transition-colors flex items-center space-x-2"
              >
                <svg v-if="!syncingEmpresa" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ syncingEmpresa ? 'Sincronizando...' : 'Sincronizar Empresa' }}</span>
              </button>
            </div>

            <p v-if="mysqlTestResult" :class="mysqlTestResult.success ? 'text-green-600' : 'text-red-600'" class="text-sm">
              {{ mysqlTestResult.message }}
            </p>
            <p v-if="empresaSyncResult" :class="empresaSyncResult.success ? 'text-green-600' : 'text-red-600'" class="text-sm">
              {{ empresaSyncResult.message }}
            </p>
          </div>
        </CollapsibleSection>

        <!-- 5. Sincronización de CAF -->
        <CollapsibleSection
          title="Sincronización de CAF"
          subtitle="Descarga automática de Códigos de Autorización de Folios"
          icon="📥"
        >
          <div class="space-y-4">
            <!-- Habilitar CAF -->
            <label class="flex items-center space-x-3 cursor-pointer">
              <input
                v-model="localConfig.cafEnabled"
                type="checkbox"
                class="w-5 h-5 text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
              />
              <span class="text-sm font-medium text-slate-700">Habilitar sincronización automática de CAF</span>
            </label>

            <!-- Botón Descargar CAF -->
            <div>
              <button
                @click="downloadCAF"
                :disabled="downloadingCAF"
                class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-primary-300 transition-colors flex items-center space-x-2"
              >
                <svg v-if="!downloadingCAF" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ downloadingCAF ? 'Descargando...' : 'Descargar CAF Ahora' }}</span>
              </button>
              <p class="text-sm text-slate-500 mt-2">
                Descarga manualmente los CAF desde el servidor y los guarda en la base de datos local
              </p>
            </div>
          </div>
        </CollapsibleSection>

        <!-- 6. Notificaciones por Email -->
        <CollapsibleSection
          title="Notificaciones por Email"
          subtitle="Alertas automáticas de errores por correo electrónico"
          icon="📧"
        >
          <div class="space-y-4">
            <!-- Habilitar Email -->
            <label class="flex items-center space-x-3 cursor-pointer">
              <input
                v-model="localConfig.emailNotifications"
                type="checkbox"
                class="w-5 h-5 text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
              />
              <span class="text-sm font-medium text-slate-700">Habilitar notificaciones por email</span>
            </label>

            <div v-if="localConfig.emailNotifications" class="space-y-4 pl-8 border-l-2 border-slate-200">
              <div class="grid grid-cols-2 gap-4">
                <!-- Email Destinatario -->
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">
                    Email Destinatario
                  </label>
                  <input
                    v-model="localConfig.emailTo"
                    type="email"
                    placeholder="admin@empresa.cl"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <!-- Email Remitente -->
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">
                    Email Remitente
                  </label>
                  <input
                    v-model="localConfig.emailFrom"
                    type="email"
                    placeholder="dte-client@iglobal.cl"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <!-- SMTP Host -->
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">
                    Servidor SMTP
                  </label>
                  <input
                    v-model="localConfig.smtpHost"
                    type="text"
                    placeholder="smtp.gmail.com"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <!-- SMTP Port -->
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">
                    Puerto SMTP
                  </label>
                  <input
                    v-model.number="localConfig.smtpPort"
                    type="number"
                    placeholder="587"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <!-- SMTP User -->
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">
                    Usuario SMTP
                  </label>
                  <input
                    v-model="localConfig.smtpUser"
                    type="text"
                    placeholder="tu@email.com"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <!-- SMTP Password -->
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">
                    Contraseña SMTP
                  </label>
                  <input
                    v-model="localConfig.smtpPass"
                    type="password"
                    placeholder="••••••••"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Para Gmail, necesitas usar una "Contraseña de Aplicación" en lugar de tu contraseña normal.
                  <a href="https://support.google.com/accounts/answer/185833" target="_blank" class="underline">Más información aquí</a>.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'

const props = defineProps<{
  config: any
}>()

const emit = defineEmits<{
  (e: 'update', config: any): void
}>()

const localConfig = ref({ ...props.config })
const showSaveMessage = ref(false)

// Estados para testing
const testingApi = ref(false)
const apiTestResult = ref<{ success: boolean; message: string } | null>(null)
const testingMysql = ref(false)
const mysqlTestResult = ref<{ success: boolean; message: string } | null>(null)
const syncingEmpresa = ref(false)
const empresaSyncResult = ref<{ success: boolean; message: string } | null>(null)
const downloadingCAF = ref(false)

// Watch para sincronizar con props
watch(() => props.config, (newConfig) => {
  localConfig.value = { ...newConfig }
}, { deep: true })

async function selectBaseFolder() {
  const result = await window.electronAPI.selectFolder()
  if (result) {
    localConfig.value.basePath = result
  }
}

async function testApiConnection() {
  if (!localConfig.value.apiUrl || !localConfig.value.apiToken) {
    apiTestResult.value = { success: false, message: 'Por favor completa URL y Token' }
    return
  }

  testingApi.value = true
  apiTestResult.value = null

  try {
    const result = await window.electronAPI.testApi(localConfig.value.apiUrl, localConfig.value.apiToken)
    apiTestResult.value = result
  } catch (error: any) {
    apiTestResult.value = { success: false, message: error.message }
  } finally {
    testingApi.value = false
  }
}

async function testMysqlConnection() {
  if (!localConfig.value.mysqlHost || !localConfig.value.mysqlDatabase) {
    mysqlTestResult.value = { success: false, message: 'Por favor completa Host y Database' }
    return
  }

  testingMysql.value = true
  mysqlTestResult.value = null

  try {
    const result = await window.electronAPI.testMysql({
      host: localConfig.value.mysqlHost,
      port: localConfig.value.mysqlPort,
      user: localConfig.value.mysqlUser,
      password: localConfig.value.mysqlPassword,
      database: localConfig.value.mysqlDatabase
    })
    mysqlTestResult.value = result
  } catch (error: any) {
    mysqlTestResult.value = { success: false, message: error.message }
  } finally {
    testingMysql.value = false
  }
}

async function syncEmpresa() {
  syncingEmpresa.value = true
  empresaSyncResult.value = null

  try {
    const result = await window.electronAPI.syncEmpresa()
    empresaSyncResult.value = result
  } catch (error: any) {
    empresaSyncResult.value = { success: false, message: error.message }
  } finally {
    syncingEmpresa.value = false
  }
}

function saveConfig() {
  emit('update', localConfig.value)
  showSaveMessage.value = true

  setTimeout(() => {
    showSaveMessage.value = false
  }, 3000)
}

async function downloadCAF() {
  downloadingCAF.value = true
  try {
    const result = await window.electronAPI.syncCAF()
    if (result.success) {
      const msg = result.count > 0
        ? `${result.message}\nCAF nuevos: ${result.count}\nYa existían: ${result.updated || 0}`
        : result.message
      alert(msg)
    } else {
      alert(`Error: ${result.message}`)
    }
  } catch (error: any) {
    alert(`Error sincronizando CAF: ${error.message}`)
  } finally {
    downloadingCAF.value = false
  }
}

function resetToDefaults() {
  if (!confirm('¿Estás seguro de restaurar todos los valores por defecto? Se perderá la configuración actual.')) {
    return
  }

  localConfig.value = {
    apiUrl: 'http://localhost:8000/api/v1/documentos',
    apiToken: '',
    basePath: 'C:\\iGlobal\\DTE',
    rut: '',
    autoStart: true,
    generatePDF417: true,
    uploadInterval: 30000,
    cafSyncInterval: 3600000,
    maxRetries: 3,
    retryDelay: 10000,
    // MySQL defaults
    mysqlHost: 'localhost',
    mysqlPort: 3306,
    mysqlUser: 'root',
    mysqlPassword: '',
    mysqlDatabase: 'iglobal_dte',
    // CAF defaults
    cafEnabled: true,
    // Email defaults
    emailNotifications: false,
    emailTo: '',
    emailFrom: 'dte-client@iglobal.cl',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: ''
  }
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
</style>
