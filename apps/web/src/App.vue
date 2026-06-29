<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTaskQueueStore } from '@/stores/taskQueue'
import { useToast } from '@/composables/useToast'
import TaskQueueBanner from '@/components/TaskQueueBanner.vue'

const auth = useAuthStore()
onMounted(() => auth.checkAuth())

const { toasts, dismiss } = useToast()
const taskQueue = useTaskQueueStore()
const toastBottom = computed(() => taskQueue.tasks.length > 0 ? '56px' : '16px')
</script>

<template>
  <RouterView />

  <TaskQueueBanner />

  <!-- グローバル Toast 通知 -->
  <Teleport to="body">
    <div
      class="fixed left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none transition-[bottom] duration-200"
      :style="{ bottom: toastBottom }"
    >
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
