<template>
  <div class="max-w-4xl max-h-[calc(100vh-220px)] overflow-y-auto">
    <div class="bg-white rounded-lg shadow-sm border border-slate-200">
      <div class="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
        <h2 class="text-lg font-semibold text-slate-800">Configuración</h2>
      </div>

      <div class="p-6 space-y-6">
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
              placeholder="C:\iGlobal"
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

        <!-- Vista previa de rutas (solo lectura) -->
        <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h4 class="text-sm font-semibold text-slate-700 mb-3">Rutas generadas automáticamente:</h4>
          <div class="space-y-2 text-xs font-mono">
            <div><span class="text-slate-500">XML:</span> <span class="text-slate-700">{{ localConfig.watchPath }}</span></div>
            <div><span class="text-slate-500">PNG:</span> <span class="text-slate-700">{{ localConfig.pngPath }}</span></div>
            <div><span class="text-slate-500">PENDING:</span> <span class="text-slate-700">{{ localConfig.pendingPath }}</span></div>
            <div><span class="text-slate-500">SENT:</span> <span class="text-slate-700">{{ localConfig.sentPath }}</span></div>
            <div><span class="text-slate-500">PROCESADO:</span> <span class="text-slate-700">{{ localConfig.processedPath }}</span></div>
            <div><span class="text-slate-500">FALLIDOS:</span> <span class="text-slate-700">{{ localConfig.failedPath }}</span></div>
          </div>
        </div>

        <!-- Separador -->
        <div class="border-t border-slate-200 pt-6">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Conexión MySQL</h3>
          <p class="text-sm text-slate-500 mb-4">Configuración para conectar con la base de datos del ERP</p>
        </div>

        <!-- MySQL Host y Port -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Host MySQL
            </label>
            <input
              v-model="localConfig.mysqlHost"
              type="text"
              placeholder="localhost"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
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
        </div>

        <!-- MySQL Database -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Nombre de Base de Datos
          </label>
          <input
            v-model="localConfig.mysqlDatabase"
            type="text"
            placeholder="iglobal_dte"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <!-- MySQL Usuario y Contraseña -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Usuario MySQL
            </label>
            <input
              v-model="localConfig.mysqlUser"
              type="text"
              placeholder="root"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Contraseña MySQL
            </label>
            <input
              v-model="localConfig.mysqlPassword"
              type="password"
              placeholder="••••••••"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- Probar Conexión MySQL -->
        <div class="flex justify-end">
          <button
            @click="testMysqlConnection"
            :disabled="testingMysql"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center space-x-2"
          >
            <svg v-if="!testingMysql" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ testingMysql ? 'Probando conexión...' : 'Probar Conexión MySQL' }}</span>
          </button>
        </div>
        <p v-if="mysqlTestResult" :class="mysqlTestResult.success ? 'text-green-600' : 'text-red-600'" class="text-sm mt-2">
          {{ mysqlTestResult.message }}
        </p>

        <!-- Separador -->
        <div class="border-t border-slate-200 pt-6">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Descarga de CAF desde API</h3>
          <p class="text-sm text-slate-500 mb-4">Descarga automática de archivos CAF desde el API Laravel y registro en MySQL</p>
        </div>

        <!-- Toggle CAF API -->
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p class="font-medium text-slate-800">Habilitar descarga de CAF desde API</p>
            <p class="text-sm text-slate-500 mt-1">Descarga y registra automáticamente los CAF en MySQL</p>
          </div>
          <button
            @click="localConfig.cafEnabled = !localConfig.cafEnabled"
            :class="localConfig.cafEnabled ? 'bg-primary-500' : 'bg-slate-300'"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <span
              :class="localConfig.cafEnabled ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            />
          </button>
        </div>

        <!-- Configuración CAF API -->
        <div v-if="localConfig.cafEnabled" class="space-y-4">
          <!-- Información de la URL del CAF -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-blue-800">
              <strong>URL de descarga de CAF:</strong> Se construye automáticamente desde la URL del API principal usando el endpoint <code class="bg-blue-100 px-2 py-1 rounded">/api/v1/caf</code>
            </p>
          </div>

          <!-- Ruta local de FOLIO -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Ruta base para archivos CAF
            </label>
            <input
              v-model="localConfig.folioPath"
              type="text"
              placeholder="C:\iGlobal\RUT_EMPRESA\FOLIO"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <!-- Botón para descargar CAF -->
          <div class="flex justify-end">
            <button
              @click="downloadCAF"
              :disabled="downloadingCAF"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg v-if="!downloadingCAF" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ downloadingCAF ? 'Sincronizando...' : 'Sincronizar CAF' }}</span>
            </button>
          </div>
        </div>

        <!-- Separador -->
        <div class="border-t border-slate-200 pt-6">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Generación de PDF417</h3>
        </div>

        <!-- Toggle PDF417 -->
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p class="font-medium text-slate-800">Generar código PDF417 del TED</p>
            <p class="text-sm text-slate-500 mt-1">Crea automáticamente la imagen PNG del timbre electrónico</p>
          </div>
          <button
            @click="localConfig.generatePDF417 = !localConfig.generatePDF417"
            :class="localConfig.generatePDF417 ? 'bg-primary-500' : 'bg-slate-300'"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <span
              :class="localConfig.generatePDF417 ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            />
          </button>
        </div>

        <!-- Carpeta PNG -->
        <div v-if="localConfig.generatePDF417">
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Carpeta de salida para PNG
          </label>
          <div class="flex space-x-2">
            <input
              v-model="localConfig.pngPath"
              type="text"
              placeholder="C:\iGlobal\RUT_EMPRESA\PNG"
              class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              @click="selectPngFolder"
              class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center space-x-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Buscar</span>
            </button>
          </div>
        </div>

        <!-- Separador -->
        <div class="border-t border-slate-200 pt-6">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Notificaciones por Email</h3>
        </div>

        <!-- Toggle notificaciones email -->
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p class="font-medium text-slate-800">Enviar emails de error</p>
            <p class="text-sm text-slate-500 mt-1">Recibe un email cuando un XML no se puede procesar</p>
          </div>
          <button
            @click="localConfig.emailNotifications = !localConfig.emailNotifications"
            :class="localConfig.emailNotifications ? 'bg-primary-500' : 'bg-slate-300'"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <span
              :class="localConfig.emailNotifications ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            />
          </button>
        </div>

        <!-- Configuración SMTP (solo si emails están activados) -->
        <div v-if="localConfig.emailNotifications" class="space-y-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <p class="text-sm text-primary-800 font-medium">Configuración SMTP</p>

          <!-- Email destinatario -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Email destinatario
            </label>
            <input
              v-model="localConfig.emailTo"
              type="email"
              placeholder="admin@empresa.cl"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <!-- SMTP Host y Port -->
          <div class="grid grid-cols-2 gap-4">
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
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Puerto
              </label>
              <input
                v-model.number="localConfig.smtpPort"
                type="number"
                placeholder="587"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- Usuario y contraseña SMTP -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Usuario SMTP
              </label>
              <input
                v-model="localConfig.smtpUser"
                type="text"
                placeholder="tu-email@gmail.com"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
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

          <div class="text-xs text-primary-800 bg-primary-100 p-3 rounded">
            <strong>Nota:</strong> Para Gmail, necesitas usar una "Contraseña de aplicación" en lugar de tu contraseña normal.
            <a href="https://support.google.com/accounts/answer/185833" target="_blank" class="underline">Más info</a>
          </div>
        </div>

        <!-- Auto-iniciar -->
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p class="font-medium text-slate-800">Auto-iniciar al abrir aplicación</p>
            <p class="text-sm text-slate-500 mt-1">Inicia automáticamente el monitoreo cuando se abre la aplicación</p>
          </div>
          <button
            @click="localConfig.autoStart = !localConfig.autoStart"
            :class="localConfig.autoStart ? 'bg-primary-500' : 'bg-slate-300'"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <span
              :class="localConfig.autoStart ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            />
          </button>
        </div>

        <!-- Botones de acción -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <button
            @click="resetToDefaults"
            class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Restaurar valores por defecto
          </button>
          <button
            @click="saveConfig"
            class="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Guardar Configuración
          </button>
        </div>

        <!-- Mensaje de guardado -->
        <div
          v-if="showSaveMessage"
          class="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Configuración guardada exitosamente</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  config: any
}>()

const emit = defineEmits<{
  update: [config: any]
}>()

const localConfig = ref({ ...props.config })
const showSaveMessage = ref(false)
const testingApi = ref(false)
const apiTestResult = ref<{ success: boolean; message: string } | null>(null)
const downloadingCAF = ref(false)
const testingMysql = ref(false)
const mysqlTestResult = ref<{ success: boolean; message: string } | null>(null)

// Sincronizar con props
watch(() => props.config, (newConfig) => {
  localConfig.value = { ...newConfig }
}, { deep: true })

// Watcher para actualizar rutas automáticamente cuando cambie el RUT o la basePath
watch(() => [localConfig.value.rut, localConfig.value.basePath], ([newRut, newBasePath]) => {
  if (newRut && newBasePath) {
    const rutForPath = newRut || 'RUT_EMPRESA'
    localConfig.value.watchPath = `${newBasePath}\\${rutForPath}\\XML`
    localConfig.value.pngPath = `${newBasePath}\\${rutForPath}\\PNG`
    localConfig.value.pendingPath = `${newBasePath}\\${rutForPath}\\XML\\PENDING`
    localConfig.value.sentPath = `${newBasePath}\\${rutForPath}\\XML\\SENT`
    localConfig.value.processedPath = `${newBasePath}\\${rutForPath}\\XML\\PROCESADO`
    localConfig.value.failedPath = `${newBasePath}\\${rutForPath}\\XML\\FALLIDOS`
    localConfig.value.folioPath = `${newBasePath}\\${rutForPath}\\FOLIO`
  }
})

async function selectBaseFolder() {
  const folder = await window.electronAPI.selectFolder()
  if (folder) {
    localConfig.value.basePath = folder
  }
}

async function testApiConnection() {
  if (!localConfig.value.apiUrl) {
    apiTestResult.value = { success: false, message: 'Por favor ingresa una URL válida' }
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
  localConfig.value = {
    apiUrl: 'http://localhost:8000/api/dte/upload',
    basePath: 'C:\\iGlobal',
    rut: '',
    autoStart: true,
    generatePDF417: true,
    uploadInterval: 120000,
    // MySQL defaults
    mysqlHost: 'localhost',
    mysqlPort: 3306,
    mysqlUser: 'root',
    mysqlPassword: '',
    mysqlDatabase: 'iglobal_dte',
    // CAF API defaults
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
