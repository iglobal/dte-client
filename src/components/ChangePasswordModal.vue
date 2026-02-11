<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="px-6 py-4 border-b border-slate-200">
        <h3 class="text-lg font-semibold text-slate-800">🔐 Cambiar Contraseña</h3>
      </div>

      <div class="p-6 space-y-4">
        <p class="text-slate-600 text-sm">
          {{ step === 1 ? 'Ingresa tu contraseña actual para continuar.' : 'Ingresa tu nueva contraseña.' }}
        </p>

        <!-- Paso 1: Contraseña actual -->
        <div v-if="step === 1">
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Contraseña Actual
          </label>
          <input
            v-model="currentPassword"
            type="password"
            placeholder="iG-XXXX-XXX"
            @keyup.enter="verifyCurrentPassword"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autofocus
          />
        </div>

        <!-- Paso 2: Nueva contraseña -->
        <div v-if="step === 2" class="space-y-4">
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
              💡 <strong>Consejo:</strong> Usa una contraseña fácil de recordar pero segura.
            </p>
          </div>
        </div>

        <!-- Errores -->
        <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
      </div>

      <div class="px-6 py-4 border-t border-slate-200 flex justify-between">
        <button
          v-if="step === 2"
          @click="goBack"
          class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          ← Atrás
        </button>
        <div v-else></div>

        <div class="flex space-x-2">
          <button
            @click="handleCancel"
            class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="step === 1 ? verifyCurrentPassword() : confirmPassword()"
            :disabled="loading"
            class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-primary-300 transition-colors"
          >
            {{ loading ? 'Verificando...' : (step === 1 ? 'Verificar' : 'Cambiar') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'cancel'): void
}>()

const step = ref(1)
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const error = ref('')
const loading = ref(false)

// Reset cuando se cierra/abre el modal
watch(() => props.show, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

function resetForm() {
  step.value = 1
  currentPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  error.value = ''
  loading.value = false
}

async function verifyCurrentPassword() {
  if (!currentPassword.value) {
    error.value = 'Por favor ingresa tu contraseña actual'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const isValid = await window.electronAPI.verifyAdminPassword(currentPassword.value)

    if (isValid) {
      step.value = 2
    } else {
      error.value = 'Contraseña incorrecta'
    }
  } catch (err: any) {
    error.value = 'Error verificando contraseña: ' + err.message
  } finally {
    loading.value = false
  }
}

async function confirmPassword() {
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

  loading.value = true
  error.value = ''

  try {
    const result = await window.electronAPI.changeAdminPassword(
      currentPassword.value,
      newPassword.value
    )

    if (result.success) {
      emit('success')
      resetForm()
    } else {
      error.value = result.message
    }
  } catch (err: any) {
    error.value = 'Error cambiando contraseña: ' + err.message
  } finally {
    loading.value = false
  }
}

function goBack() {
  step.value = 1
  newPassword.value = ''
  confirmNewPassword.value = ''
  error.value = ''
}

function handleCancel() {
  emit('cancel')
  resetForm()
}
</script>
