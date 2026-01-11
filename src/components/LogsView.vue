<template>
  <div class="bg-white rounded-lg shadow-sm border border-slate-200">
    <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-800">Historial de Logs</h2>
      <div class="flex items-center space-x-2">
        <!-- Filtros -->
        <select v-model="filterType" class="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Todos</option>
          <option value="info">Info</option>
          <option value="success">Éxito</option>
          <option value="warning">Advertencia</option>
          <option value="error">Error</option>
        </select>
      </div>
    </div>

    <div class="p-6">
      <div v-if="filteredLogs.length === 0" class="text-center py-12 text-slate-400">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-lg font-medium">No hay logs disponibles</p>
      </div>

      <div v-else class="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="flex items-start space-x-3 p-4 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
        >
          <!-- Icono -->
          <div :class="getLogIconClass(log.type)" class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg v-if="log.type === 'success'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else-if="log.type === 'error'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <svg v-else-if="log.type === 'warning'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <!-- Contenido -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span :class="getLogTextClass(log.type)" class="text-xs font-semibold uppercase tracking-wide">
                {{ log.type }}
              </span>
              <span class="text-xs text-slate-500">{{ formatTime(log.timestamp) }}</span>
            </div>
            <p class="text-sm text-slate-700 mt-1 break-words">{{ log.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  logs: any[]
}>()

const filterType = ref('all')

const filteredLogs = computed(() => {
  if (filterType.value === 'all') {
    return props.logs
  }
  return props.logs.filter(log => log.type === filterType.value)
})

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getLogIconClass(type: string) {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-600'
    case 'error':
      return 'bg-red-100 text-red-600'
    case 'warning':
      return 'bg-yellow-100 text-yellow-600'
    default:
      return 'bg-blue-100 text-blue-600'
  }
}

function getLogTextClass(type: string) {
  switch (type) {
    case 'success':
      return 'text-green-600'
    case 'error':
      return 'text-red-600'
    case 'warning':
      return 'text-yellow-600'
    default:
      return 'text-blue-600'
  }
}
</script>
