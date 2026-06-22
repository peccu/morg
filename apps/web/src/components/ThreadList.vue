<script setup lang="ts">
import { ref, computed, defineExpose } from 'vue'
import ThreadListItem from './ThreadListItem.vue'
import type { ThreadListItem as TThreadListItem } from '@morg/shared'

const props = defineProps<{
  threads: TThreadListItem[]
  isFetching: boolean
  isError: boolean
  error: Error | null
  hasNextPage: boolean
  checkedIds: Set<string>
  autoFetchStopped: boolean
  autoFetchEnabled: boolean
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
const listEl = ref<HTMLElement | null>(null)

defineExpose({
  scrollToTop() {
    listEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
  },
})

const allChecked = computed(
  () => props.threads.length > 0 && props.threads.every((t) => props.checkedIds.has(t.threadId)),
)

function toggleSelectAll() {
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
</script>

<template>
  <div class="flex flex-col overflow-hidden">
    <!-- 全選択バー（min-h-[44px] で Apple HIG 準拠） -->
    <div
      v-if="threads.length > 0"
      class="flex items-center gap-2 px-2 border-b bg-gray-50 text-sm flex-shrink-0 min-h-[44px]"
    >
      <button
        class="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900 min-h-[44px] pr-2"
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
        <span>全て選択</span>
      </button>

      <span class="text-xs text-gray-400">
        {{ threads.length }}件
        <template v-if="checkedIds.size > 0">中 {{ checkedIds.size }}件選択中</template>
      </span>

      <!-- 右端固定エリア：取得状況 + 選択解除 -->
      <div class="ml-auto flex items-center gap-1 flex-shrink-0">
        <template v-if="autoFetchEnabled && hasNextPage && !autoFetchStopped">
          <svg class="w-3.5 h-3.5 animate-spin text-forest-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <button
            class="min-h-[44px] px-2.5 flex items-center text-sm text-gray-500 hover:text-gray-800 border rounded cursor-pointer"
            @click="emit('stopFetch')"
          >止める</button>
        </template>
        <button
          v-if="checkedIds.size > 0"
          class="min-h-[44px] px-3 text-gray-400 hover:text-gray-600 cursor-pointer text-sm flex items-center"
          @click="emit('clearAll')"
        >選択解除</button>
      </div>
    </div>

    <!-- スレッド一覧 -->
    <div ref="listEl" class="flex-1 overflow-y-auto min-h-0">
      <div v-if="isFetching && threads.length === 0" class="p-8 text-center text-gray-400 text-sm">
        読み込み中...
      </div>
      <div v-else-if="isError" class="p-6 text-sm">
        <p class="text-red-500 font-medium">取得に失敗しました</p>
        <details class="mt-2 text-gray-400">
          <summary class="cursor-pointer text-xs">詳細を表示</summary>
          <pre class="mt-1 text-xs whitespace-pre-wrap break-all">{{ (error as Error)?.message }}</pre>
        </details>
      </div>
      <div v-else-if="threads.length === 0" class="p-8 text-center text-gray-400 text-sm">
        メールがありません
      </div>
      <template v-else>
        <ThreadListItem
          v-for="thread in threads"
          :key="thread.threadId"
          :thread="thread"
          :selected="selectedId === thread.threadId"
          :checked="checkedIds.has(thread.threadId)"
          :selection-mode="checkedIds.size > 0"
          @click="select(thread)"
          @check="emit('check', $event)"
        />
        <!-- 次ページあり：inbox は常時「もっと読む」、検索中で停止時は「続きを取得」 -->
        <div v-if="hasNextPage && (!autoFetchEnabled || autoFetchStopped)" class="flex items-center justify-end gap-3 px-4 py-3 border-t text-sm">
          <button
            class="px-3 min-h-[44px] flex items-center text-sm text-forest-600 hover:text-forest-800 border rounded cursor-pointer"
            :disabled="isFetching"
            @click="emit('loadMore')"
          >{{ isFetching ? '読み込み中...' : (autoFetchEnabled ? '続きを取得' : 'もっと読む') }}</button>
        </div>

        <!-- 全件読み込み完了 -->
        <div v-else-if="!hasNextPage" class="py-3 text-center text-xs text-gray-400 border-t">
          全{{ threads.length }}件
        </div>
      </template>
    </div>
  </div>
</template>
