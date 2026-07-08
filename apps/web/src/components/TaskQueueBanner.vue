<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTaskQueueStore } from '@/stores/taskQueue'
import type { QueueTask } from '@/stores/taskQueue'

const store = useTaskQueueStore()
const router = useRouter()
const { t } = useI18n()

function progressPct(task: QueueTask) {
  return task.total > 0 ? Math.round((task.processed / task.total) * 100) : 0
}

function etaText(task: QueueTask) {
  if (task.etaMs === null) return null
  const secs = Math.ceil(task.etaMs / 1000)
  if (secs < 60) return t('time.sec', { n: secs })
  return t('time.min', { n: Math.ceil(secs / 60) })
}

const activeTasks    = computed(() => store.tasks.filter(t => t.status === 'pending' || t.status === 'running'))
const hasRunning     = computed(() => store.tasks.some(t => t.status === 'running'))
const hasInterrupted = computed(() => store.hasInterrupted)
</script>

<template>
  <Teleport to="body">
    <!-- 展開バナー -->
    <Transition name="queue-banner">
      <div
        v-if="store.tasks.length > 0 && !store.bannerCollapsed"
        class="fixed bottom-0 left-0 right-0 z-[150] bg-forest-900/95 backdrop-blur-sm text-white safe-bottom"
      >
        <!-- 折りたたみヘッダー -->
        <div class="flex items-center justify-between px-3 h-7 border-b border-forest-700/60">
          <span class="text-xs text-forest-400">{{ store.tasks.length }} {{ store.tasks.length === 1 ? 'task' : 'tasks' }}</span>
          <button
            class="w-8 h-7 flex items-center justify-center text-forest-400 hover:text-white cursor-pointer text-xs"
            @click="store.toggleBanner()"
            aria-label="collapse"
          >▼</button>
        </div>

        <div
          v-for="task in store.tasks"
          :key="task.id"
          class="border-t border-forest-700/60 first:border-t-0"
        >
          <!-- メインの行 -->
          <div class="flex items-center gap-2 px-3 h-11 text-sm">
            <!-- ステータスアイコン -->
            <span class="flex-shrink-0 w-4 flex items-center justify-center">
              <svg
                v-if="task.status === 'running'"
                class="w-3.5 h-3.5 animate-spin text-forest-400"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <span v-else-if="task.status === 'pending'"     class="text-forest-400 text-xs">⏳</span>
              <span v-else-if="task.status === 'done'"        class="text-green-400 text-xs">✓</span>
              <span v-else-if="task.status === 'error'"       class="text-red-400 text-xs">⚠</span>
              <span v-else-if="task.status === 'interrupted'" class="text-amber-400 text-xs">⏸</span>
            </span>

            <!-- ラベル -->
            <span class="text-xs font-medium truncate min-w-0 flex-1">{{ task.label }}</span>

            <!-- running: 進捗数値 + ETA -->
            <template v-if="task.status === 'running'">
              <span class="text-xs text-forest-300 flex-shrink-0">{{ task.processed }}/{{ task.total }}</span>
              <span v-if="etaText(task)" class="text-xs text-forest-400 flex-shrink-0">~{{ etaText(task) }}</span>
            </template>

            <!-- pending -->
            <span v-else-if="task.status === 'pending'" class="text-xs text-forest-400 flex-shrink-0">{{ t('queue.waiting') }}</span>

            <!-- done -->
            <span v-else-if="task.status === 'done'" class="text-xs text-green-400 flex-shrink-0">{{ t('queue.done') }}</span>

            <!-- error -->
            <span v-else-if="task.status === 'error'" class="text-xs text-red-300 truncate flex-shrink min-w-0 max-w-[120px]">{{ task.error }}</span>

            <!-- interrupted: progress so far -->
            <template v-else-if="task.status === 'interrupted'">
              <span class="text-xs text-amber-300 flex-shrink-0">{{ task.processed }}/{{ task.total }}</span>
              <span class="text-xs text-amber-400 flex-shrink-0">{{ t('queue.interrupted') }}</span>
            </template>

            <!-- 戻るボタン（running/pending） -->
            <button
              v-if="task.status === 'running' || task.status === 'pending'"
              class="text-xs text-forest-300 hover:text-white px-2 h-8 rounded hover:bg-forest-700 cursor-pointer flex-shrink-0 transition-colors"
              @click="router.push(task.originPath)"
            >{{ t('actions.back') }}</button>

            <!-- 再開ボタン（interrupted） -->
            <button
              v-if="task.status === 'interrupted'"
              class="text-xs text-amber-300 hover:text-white px-2 h-8 rounded hover:bg-amber-700 cursor-pointer flex-shrink-0 transition-colors font-medium"
              @click="store.resume(task.id)"
            >{{ t('actions.resume') }}</button>

            <!-- リトライボタン（error かつ未処理残りあり） -->
            <button
              v-if="task.status === 'error' && task.processed < task.total"
              class="text-xs text-amber-300 hover:text-white px-2 h-8 rounded hover:bg-forest-700 cursor-pointer flex-shrink-0 transition-colors"
              @click="store.retry(task.id)"
            >{{ t('actions.retry') }}</button>

            <!-- 閉じるボタン（done/error/interrupted） -->
            <button
              v-if="task.status === 'done' || task.status === 'error' || task.status === 'interrupted'"
              class="w-8 h-8 flex items-center justify-center text-forest-400 hover:text-white cursor-pointer flex-shrink-0"
              @click="store.dismiss(task.id)"
            >✕</button>
          </div>

          <!-- プログレスバー（running / interrupted） -->
          <div v-if="task.status === 'running' || task.status === 'interrupted'" class="h-0.5 bg-forest-700">
            <div
              class="h-0.5 transition-[width] duration-300"
              :class="task.status === 'interrupted' ? 'bg-amber-500' : 'bg-forest-400'"
              :style="{ width: progressPct(task) + '%' }"
            />
          </div>
        </div>
      </div>
    </Transition>

    <!-- フローティング展開ボタン（折りたたみ時） -->
    <Transition name="fab">
      <button
        v-if="store.tasks.length > 0 && store.bannerCollapsed"
        class="fixed bottom-4 right-4 z-[160] flex items-center gap-1.5 h-9 px-3 rounded-full bg-forest-800 text-white shadow-lg hover:bg-forest-700 cursor-pointer transition-colors"
        @click="store.toggleBanner()"
        aria-label="expand task queue"
      >
        <!-- スピナー or 中断 or 完了アイコン -->
        <svg
          v-if="hasRunning"
          class="w-3 h-3 animate-spin text-forest-300"
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <span v-else-if="hasInterrupted" class="text-xs text-amber-400">⏸</span>
        <span v-else class="text-xs">✓</span>

        <!-- アクティブ件数 -->
        <span v-if="activeTasks.length > 0" class="text-xs font-medium">{{ activeTasks.length }}</span>
        <span v-else class="text-xs font-medium">{{ store.tasks.length }}</span>

        <!-- 展開インジケーター -->
        <span class="text-forest-400 text-xs">▲</span>
      </button>
    </Transition>
  </Teleport>
</template>

<style scoped>
.queue-banner-enter-active,
.queue-banner-leave-active {
  transition: transform 0.2s ease-out;
}
.queue-banner-enter-from,
.queue-banner-leave-to {
  transform: translateY(100%);
}

.fab-enter-active,
.fab-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
