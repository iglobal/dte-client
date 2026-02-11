<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="px-6 py-4 border-b border-slate-200">
        <h3 class="text-lg font-semibold text-slate-800">🔐 {{ title }}</h3>
      </div>

      <div class="p-6">
        <p class="text-slate-600 mb-4">{{ message }}</p>

        <div v-if="showPasswordInput">
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Ingresa la contraseña de administrador
          </label>
          <input
            v-model="inputPassword"
            type="password"
            placeholder="iG-XXXX-XXX"
            @keyup.enter="handleSubmit"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autofocus
          />
          <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>
        </div>

        <div v-else class="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <code class="text-2xl font-bold text-primary-600 tracking-wider">{{ password }}</code>
            <button
              @click="copyPassword"
              class="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
            >
              {{ copied ? '✓ Copiado' : '📋 Copiar' }}
            </button>
          </div>
        </div>

        <div v-if="!showPasswordInput" class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-sm text-yellow-800">
            <strong>⚠️ Importante:</strong> Guarda esta contraseña en un lugar seguro.
            La necesitarás para acceder a la configuración de la aplicación.
          </p>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-slate-200 flex justify-end space-x-2">
        <button
          v-if="showCancel"
          @click="handleCancel"
          class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="handleSubmit"
          class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          {{ submitText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  title: string
  message: string
  password?: string
  showPasswordInput?: boolean
  showCancel?: boolean
  submitText?: string
}>()

const emit = defineEmits<{
  (e: 'submit', password?: string): void
  (e: 'cancel'): void
}>()

const inputPassword = ref('')
const error = ref('')
const copied = ref(false)

// Limpiar input cuando se cierra el modal
watch(() => props.show, (newVal) => {
  if (!newVal) {
    inputPassword.value = ''
    error.value = ''
  }
})

function copyPassword() {
  if (props.password) {
    navigator.clipboard.writeText(props.password)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function handleSubmit() {
  if (props.showPasswordInput) {
    if (!inputPassword.value) {
      error.value = 'Por favor ingresa la contraseña'
      return
    }
    emit('submit', inputPassword.value)
  } else {
    emit('submit')
  }
}

function handleCancel() {
  inputPassword.value = ''
  error.value = ''
  emit('cancel')
}
</script>
