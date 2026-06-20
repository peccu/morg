<script setup lang="ts">
import { ref, computed } from 'vue'
import ThreadListItem from './ThreadListItem.vue'
import type { ThreadListItem as TThreadListItem } from '@morg/shared'

const props = defineProps<{
  threads: TThreadListItem[]
  isFetching: boolean
  isError: boolean
  error: Error | null
  hasNextPage: boolean
  checkedIds: Set<string>
}>()
const emit = defineEmits<{
  select: [thread: TThreadListItem]
  check: [id: string]
  loadMore: []
  selectAll: [ids: string[]]
  clearAll: []
}>()

const selectedId = ref<string | null>(null)

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
  <div class="flex flex-col h-full">
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
          :class="allChecked ? 'bg-blue-500 border-blue-500' : checkedIds.size > 0 ? 'bg-blue-100 border-blue-400' : 'border-gray-400'"
        >
          <svg v-if="allChecked" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div v-else-if="checkedIds.size > 0" class="w-2.5 h-0.5 bg-blue-500 rounded" />
        </div>
        <span>全て選択</span>
      </button>

      <span v-if="checkedIds.size > 0" class="text-gray-400 text-xs">
        {{ checkedIds.size }} / {{ threads.length }} 件選択中
      </span>

      <button
        v-if="checkedIds.size > 0"
        class="ml-auto min-h-[44px] px-3 text-gray-400 hover:text-gray-600 cursor-pointer text-sm flex items-center"
        @click="emit('clearAll')"
      >選択解除</button>
    </div>

    <!-- スレッド一覧 -->
    <div class="flex-1 overflow-y-auto">
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
        <div v-if="hasNextPage" class="p-4 text-center">
          <button
            class="text-sm text-blue-500 hover:text-blue-700 disabled:opacity-50 cursor-pointer min-h-[44px] px-4 flex items-center mx-auto"
            :disabled="isFetching"
            @click="emit('loadMore')"
          >
            {{ isFetching ? '読み込み中...' : 'もっと読む' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
