<script setup lang="ts">
import { ref } from 'vue'
import { useBulkAction } from '@/composables/useBulkAction'
import type { BatchAction } from '@morg/shared'
import type { LabelItem } from '@/composables/useLabels'

const props = defineProps<{ selectedIds: string[]; labels: LabelItem[] }>()
const emit = defineEmits<{ clear: [] }>()

const { execute, isProcessing } = useBulkAction()
const showLabelMenu = ref(false)

async function run(action: BatchAction, labelId?: string) {
  await execute(props.selectedIds, action, labelId)
  showLabelMenu.value = false
  emit('clear')
}

const userLabels = () => props.labels.filter((l) => l.type === 'user')
</script>

<template>
  <div
    v-if="selectedIds.length > 0"
    class="flex items-center gap-1.5 px-2 bg-blue-50 border-b text-sm flex-shrink-0 flex-wrap relative min-h-[44px]"
  >
    <!-- 処理中オーバーレイ -->
    <div
      v-if="isProcessing"
      class="absolute inset-0 bg-blue-50/80 flex items-center justify-center gap-2 z-10"
    >
      <!-- スピナー -->
      <svg class="w-4 h-4 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span class="text-sm text-blue-700 font-medium">処理中...</span>
    </div>

    <span class="text-blue-700 font-medium text-xs">{{ selectedIds.length }}件</span>

    <button
      :disabled="isProcessing"
      class="px-3 min-h-[44px] flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm"
      @click="run('archive')"
    >アーカイブ</button>

    <button
      :disabled="isProcessing"
      class="px-3 min-h-[44px] flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm"
      @click="run('trash')"
    >削除</button>

    <button
      :disabled="isProcessing"
      class="px-3 min-h-[44px] flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm"
      @click="run('markRead')"
    >既読</button>

    <button
      :disabled="isProcessing"
      class="px-3 min-h-[44px] flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm"
      @click="run('markUnread')"
    >未読</button>

    <!-- ラベル追加ドロップダウン -->
    <div class="relative">
      <button
        :disabled="isProcessing || userLabels().length === 0"
        class="px-3 min-h-[44px] flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm"
        @click="showLabelMenu = !showLabelMenu"
      >ラベル ▾</button>

      <div
        v-if="showLabelMenu"
        class="absolute left-0 top-full mt-1 z-50 bg-white border rounded shadow-lg min-w-36 py-1"
      >
        <button
          v-for="l in userLabels()"
          :key="l.id"
          class="w-full text-left px-4 min-h-[44px] flex items-center text-sm hover:bg-gray-50 cursor-pointer"
          @click="run('addLabel', l.id)"
        >{{ l.name }}</button>
      </div>
    </div>

    <!-- 閉じるボタン -->
    <button
      :disabled="isProcessing"
      class="ml-auto w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer text-lg disabled:opacity-30"
      @click="showLabelMenu = false; emit('clear')"
    >✕</button>
  </div>

  <!-- ドロップダウン外クリックで閉じる -->
  <div
    v-if="showLabelMenu"
    class="fixed inset-0 z-40"
    @click="showLabelMenu = false"
  />
</template>
