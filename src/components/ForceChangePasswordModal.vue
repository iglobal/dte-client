<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="px-6 py-4 border-b border-slate-200">
        <h3 class="text-lg font-semibold text-slate-800">🔐 Primera Configuración</h3>
      </div>

      <div class="p-6 space-y-4">
        <!-- Mostrar contraseña inicial -->
        <div class="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <p class="text-sm font-semibold text-yellow-900 mb-2">⚠️ Contraseña temporal generada:</p>
          <div class="flex items-center justify-between bg-white rounded p-3">
            <code class="text-xl font-bold text-primary-600 tracking-wider">{{ initialPassword }}</code>
            <button
              @click="copyPassword"
              class="px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors text-sm"
            >
              {{ copied ? '✓' : '📋' }}
            </button>
          </div>
        </div>

        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-800">
            <strong>🔒 Importante:</strong> Debes cambiar esta contraseña antes de continuar.
          </p>
        </div>

        <!-- Nueva contraseña -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Nueva Contraseña
          </label>
          <input
            v-model="newPassword"
            type="password"
            placeholder="Mínimo 6 caracteres"
            @keyup.enter="confirmPassword"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autofocus
          />
        </div>

        <!-- Confirmar nueva contraseña -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Confirmar Nueva Contraseña
          </label>
          <input
            v-model="confirmNewPassword"
            type="password"
            placeholder="Repetir contraseña"
            @keyup.enter="confirmPassword"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-sm text-blue-800">
            💡 <strong>Consejo:</strong> Usa una contraseña que puedas recordar pero segura (mínimo 6 caracteres).
          </p>
        </div>

        <!-- Errores -->
        <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
      </div>

      <div class="px-6 py-4 border-t border-slate-200 flex justify-end">
        <button
          @click="confirmPassword"
          :disabled="loading"
          class="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-primary-300 transition-colors font-medium"
        >
          {{ loading ? 'Cambiando...' : 'Cambiar Contraseña y Continuar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  show: boolean
  initialPassword: string
}>()

const emit = defineEmits<{
  (e: 'success'): void
}>()

const newPassword = ref('')
const confirmNewPassword = ref('')
const error = ref('')
const loading = ref(false)
const copied = ref(false)

function copyPassword() {
  navigator.clipboard.writeText(props.initialPassword)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

async function confirmPassword() {
  error.value = ''

  if (!newPassword.value) {
    error.value = 'Por favor ingresa una nueva contraseña'
    return
  }

  if (newPassword.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }

  if (newPassword.value !== confirmNewPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  if (newPassword.value === props.initialPassword) {
    error.value = 'Debes usar una contraseña diferente a la temporal'
    return
  }

  loading.value = true

  try {
    const result = await window.electronAPI.changeAdminPassword(
      props.initialPassword,
      newPassword.value
    )

    if (result.success) {
      emit('success')
      newPassword.value = ''
      confirmNewPassword.value = ''
    } else {
      error.value = result.message
    }
  } catch (err: any) {
    error.value = 'Error cambiando contraseña: ' + err.message
  } finally {
    loading.value = false
  }
}
</script>
