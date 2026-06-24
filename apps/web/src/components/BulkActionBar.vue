<script setup lang="ts">
import { ref, watch } from 'vue'
import { useBulkAction } from '@/composables/useBulkAction'
import type { BatchAction } from '@morg/shared'
import type { LabelItem } from '@/composables/useLabels'

const props = defineProps<{ selectedIds: string[]; labels: LabelItem[] }>()
const emit = defineEmits<{ clear: []; 'update:isProcessing': [boolean] }>()

const { execute, isProcessing } = useBulkAction()
const showLabelMenu = ref(false)

watch(isProcessing, (val) => emit('update:isProcessing', val))

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
    class="flex flex-col bg-forest-50 border-b text-sm flex-shrink-0 relative"
  >
    <!-- 処理中オーバーレイ -->
    <div
      v-if="isProcessing"
      class="absolute inset-0 bg-forest-50/80 flex items-center justify-center gap-2 z-10"
    >
      <svg class="w-4 h-4 animate-spin text-forest-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span class="text-sm text-forest-700 font-medium">処理中...</span>
    </div>

    <!-- 1行目: 件数 + 閉じるボタン -->
    <div class="flex items-center px-2 pt-1 pb-0.5">
      <span class="text-forest-700 font-medium text-xs">{{ selectedIds.length }}件選択中</span>
      <button
        :disabled="isProcessing"
        class="ml-auto w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer text-base disabled:opacity-30"
        @click="showLabelMenu = false; emit('clear')"
      >✕</button>
    </div>

    <!-- 2行目: アクションボタン（横スクロール） -->
    <div class="flex items-center gap-1.5 px-2 pb-2 overflow-x-auto">
      <button
        :disabled="isProcessing"
        class="px-3 h-9 flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm flex-shrink-0"
        @click="run('archive')"
      >アーカイブ</button>

      <button
        :disabled="isProcessing"
        class="px-3 h-9 flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm flex-shrink-0"
        @click="run('trash')"
      >削除</button>

      <button
        :disabled="isProcessing"
        class="px-3 h-9 flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm flex-shrink-0"
        @click="run('markRead')"
      >既読</button>

      <button
        :disabled="isProcessing"
        class="px-3 h-9 flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm flex-shrink-0"
        @click="run('markUnread')"
      >未読</button>

      <!-- ラベル追加ドロップダウン -->
      <div class="relative flex-shrink-0">
        <button
          :disabled="isProcessing || userLabels().length === 0"
          class="px-3 h-9 flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-sm"
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
    </div>
  </div>

  <!-- ドロップダウン外クリックで閉じる -->
  <div
    v-if="showLabelMenu"
    class="fixed inset-0 z-40"
    @click="showLabelMenu = false"
  />
</template>
