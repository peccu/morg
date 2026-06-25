<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
onMounted(() => auth.checkAuth())

const { toasts, dismiss } = useToast()
</script>

<template>
  <RouterView />

  <!-- グローバル Toast 通知 -->
  <Teleport to="body">
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium min-w-[160px] max-w-xs text-center cursor-pointer"
          :class="{
            'bg-forest-700 text-white': toast.type === 'success',
            'bg-red-600 text-white':    toast.type === 'error',
            'bg-gray-800 text-white':   toast.type === 'info',
          }"
          @click="dismiss(toast.id)"
        >
          <span class="flex-1">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
