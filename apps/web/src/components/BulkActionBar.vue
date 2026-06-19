<script setup lang="ts">
import { useBulkAction } from '@/composables/useBulkAction'
import type { BatchAction } from '@morg/shared'

const props = defineProps<{ selectedIds: string[] }>()
const emit = defineEmits<{ clear: [] }>()

const { execute, isProcessing } = useBulkAction()

async function run(action: BatchAction) {
  await execute(props.selectedIds, action)
  emit('clear')
}
</script>

<template>
  <div
    v-if="selectedIds.length > 0"
    class="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b text-sm flex-shrink-0"
  >
    <span class="text-blue-700 font-medium mr-1">{{ selectedIds.length }}件選択</span>

    <button
      :disabled="isProcessing"
      class="px-3 py-1 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
      @click="run('archive')"
    >アーカイブ</button>

    <button
      :disabled="isProcessing"
      class="px-3 py-1 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
      @click="run('trash')"
    >削除</button>

    <button
      :disabled="isProcessing"
      class="px-3 py-1 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
      @click="run('markRead')"
    >既読</button>

    <button
      :disabled="isProcessing"
      class="px-3 py-1 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
      @click="run('markUnread')"
    >未読</button>

    <button
      class="ml-auto text-gray-400 hover:text-gray-600 cursor-pointer"
      @click="emit('clear')"
    >✕</button>
  </div>
</template>
