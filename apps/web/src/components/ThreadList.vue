<script setup lang="ts">
import { ref, computed } from 'vue'
import ThreadListItem from './ThreadListItem.vue'
import { useThreads } from '@/composables/useThreads'
import type { ThreadListItem as TThreadListItem } from '@morg/shared'

const props = defineProps<{ query: string }>()
const emit = defineEmits<{ select: [thread: TThreadListItem] }>()

const selectedId = ref<string | null>(null)
const q = computed(() => props.query)

const { data, isFetching, isError, fetchNextPage, hasNextPage } = useThreads(q)

const threads = computed(() =>
  data.value?.pages.flatMap((p) => p.threads) ?? []
)

function select(thread: TThreadListItem) {
  selectedId.value = thread.threadId
  emit('select', thread)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- スレッド一覧 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="isFetching && threads.length === 0" class="p-8 text-center text-gray-400 text-sm">
        読み込み中...
      </div>
      <div v-else-if="isError" class="p-8 text-center text-red-400 text-sm">
        取得に失敗しました
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
          @click="select(thread)"
        />
        <div v-if="hasNextPage" class="p-4 text-center">
          <button
            class="text-sm text-blue-500 hover:text-blue-700 disabled:opacity-50 cursor-pointer"
            :disabled="isFetching"
            @click="fetchNextPage()"
          >
            {{ isFetching ? '読み込み中...' : 'もっと読む' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
