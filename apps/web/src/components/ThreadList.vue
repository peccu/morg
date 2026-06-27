<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ThreadListItem from './ThreadListItem.vue'
import type { ThreadListItem as TThreadListItem } from '@morg/shared'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  threads: TThreadListItem[]
  isFetching: boolean
  isError: boolean
  error: Error | null
  hasNextPage: boolean
  checkedIds: Set<string>
  autoFetchStopped: boolean
  autoFetchEnabled: boolean
  autoFetchActive: boolean
  isProcessing?: boolean
}>()
const emit = defineEmits<{
  select: [thread: TThreadListItem]
  check: [id: string]
  loadMore: []
  stopFetch: []
  selectAll: [ids: string[]]
  clearAll: []
}>()

const selectedId = ref<string | null>(null)

const { show: notify } = useToast()
const { t } = useI18n()
function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => notify(t('status.copied'), 'success'))
}

const allChecked = computed(
  () => props.threads.length > 0 && props.threads.every((t) => props.checkedIds.has(t.threadId)),
)

function toggleSelectAll() {
  if (props.isProcessing) return
  if (allChecked.value) {
    emit('clearAll')
  } else {
    emit('selectAll', props.threads.map((t) => t.threadId))
  }
}

function select(thread: TThreadListItem) {
  selectedId.value = thread.threadId
  emit('select', thread)
}

const isScrolling = ref(false)
let scrollTimer: ReturnType<typeof setTimeout> | null = null

function onScroll() {
  isScrolling.value = true
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    isScrolling.value = false
  }, 1000)
}

onUnmounted(() => {
  if (scrollTimer) clearTimeout(scrollTimer)
})
</script>

<template>
  <div class="flex flex-col overflow-hidden">
    <!-- 全選択バー（min-h-[44px] で Apple HIG 準拠） -->
    <div
      v-if="threads.length > 0"
      class="flex items-center gap-2 px-2 border-b bg-gray-50 text-sm flex-shrink-0 min-h-[44px]"
    >
      <button
        class="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900 min-h-[44px] pr-2 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isProcessing"
        @click="toggleSelectAll"
      >
        <div
          class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
          :class="allChecked ? 'bg-forest-600 border-forest-600' : checkedIds.size > 0 ? 'bg-forest-100 border-forest-400' : 'border-gray-400'"
        >
          <svg v-if="allChecked" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div v-else-if="checkedIds.size > 0" class="w-2.5 h-0.5 bg-forest-600 rounded" />
        </div>
        <span>{{ t('thread.selectAll') }}</span>
      </button>

      <span class="text-xs text-gray-400">
        {{ t('thread.count', { n: threads.length }) }}
        <template v-if="checkedIds.size > 0">{{ t('thread.countSelected', { selected: checkedIds.size }) }}</template>
      </span>

      <!-- 右端固定エリア：取得状況 + 選択解除 -->
      <div class="ml-auto flex items-center gap-1 flex-shrink-0">
        <template v-if="autoFetchEnabled && autoFetchActive && hasNextPage && !autoFetchStopped">
          <svg class="w-3.5 h-3.5 animate-spin text-forest-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <button
            class="min-h-[44px] px-2.5 flex items-center text-sm text-gray-500 hover:text-gray-800 border rounded cursor-pointer"
            @click="emit('stopFetch')"
          >{{ t('actions.stop') }}</button>
        </template>
      </div>
    </div>

    <!-- スレッド一覧 -->
    <div
      class="flex-1 overflow-y-scroll min-h-0 thread-list-scroll"
      :class="{ 'is-scrolling': isScrolling }"
      @scroll.passive="onScroll"
    >
      <div v-if="isFetching && threads.length === 0" class="p-8 text-center text-gray-400 text-sm">
        {{ t('status.loading') }}
      </div>
      <div v-else-if="isError" class="p-6 text-sm">
        <p class="text-red-500 font-medium">{{ t('status.fetchError') }}</p>
        <details class="mt-2 text-gray-400">
          <summary class="cursor-pointer text-xs">{{ t('thread.showDetail') }}</summary>
          <pre class="mt-1 text-xs whitespace-pre-wrap break-all">{{ (error as Error)?.message }}</pre>
          <button
            class="mt-2 text-xs px-2 py-1 border rounded hover:bg-gray-50 cursor-pointer"
            @click="copyText((error as Error)?.message ?? '')"
          >{{ t('actions.copy') }}</button>
        </details>
      </div>
      <div v-else-if="threads.length === 0" class="p-8 text-center text-gray-400 text-sm">
        {{ t('status.noMail') }}
      </div>
      <template v-else>
        <ThreadListItem
          v-for="thread in threads"
          :key="thread.threadId"
          :thread="thread"
          :selected="selectedId === thread.threadId"
          :checked="checkedIds.has(thread.threadId)"
          :selection-mode="checkedIds.size > 0"
          :class="{ 'pointer-events-none': isProcessing }"
          @click="select(thread)"
          @check="emit('check', $event)"
        />
        <!-- 次ページあり：inbox は常時「もっと読む」、検索中で停止時は「続きを取得」 -->
        <div v-if="hasNextPage && (!autoFetchEnabled || autoFetchStopped)" class="flex items-center justify-end gap-3 px-4 py-3 border-t text-sm">
          <button
            class="px-3 min-h-[44px] flex items-center text-sm text-forest-600 hover:text-forest-800 border rounded cursor-pointer"
            :disabled="isFetching"
            @click="emit('loadMore')"
          >{{ isFetching ? t('status.loading') : (autoFetchEnabled ? t('actions.loadMoreSearch') : t('actions.loadMore')) }}</button>
        </div>

        <!-- 全件読み込み完了 -->
        <div v-else-if="!hasNextPage" class="py-3 text-center text-xs text-gray-400 border-t">
          {{ t('thread.allCount', { n: threads.length }) }}
        </div>
      </template>
    </div>
  </div>
</template>
