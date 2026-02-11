<template>
  <div class="border-slate-200">
    <button
      @click="isOpen = !isOpen"
      class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
    >
      <div class="flex items-center space-x-3">
        <span class="text-2xl">{{ icon }}</span>
        <div class="text-left">
          <h3 class="text-sm font-semibold text-slate-800">{{ title }}</h3>
          <p class="text-xs text-slate-500">{{ subtitle }}</p>
        </div>
      </div>
      <svg
        class="w-5 h-5 text-slate-400 transform transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-show="isOpen"
      class="px-6 py-4 bg-slate-50/50"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  subtitle: string
  icon: string
  defaultOpen?: boolean
}>()

const isOpen = ref(props.defaultOpen ?? false)
</script>
