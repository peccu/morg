<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBulkAction } from '@/composables/useBulkAction'
import type { BatchAction } from '@morg/shared'
import type { LabelItem } from '@/composables/useLabels'

const props = defineProps<{ selectedIds: string[]; labels: LabelItem[] }>()
const emit = defineEmits<{ clear: []; 'update:isProcessing': [boolean] }>()

const { execute, isProcessing, progress, etaMs } = useBulkAction()

const progressPct = computed(() =>
  progress.value.total > 0
    ? Math.round((progress.value.processed / progress.value.total) * 100)
    : 0,
)

const etaText = computed(() => {
  if (etaMs.value === null) return null
  const secs = Math.ceil(etaMs.value / 1000)
  if (secs < 60) return `${secs}秒`
  return `${Math.ceil(secs / 60)}分`
})
const showLabelMenu = ref(false)
const showDeleteConfirm = ref(false)

watch(isProcessing, (val) => emit('update:isProcessing', val))

async function run(action: BatchAction, labelId?: string) {
  await execute(props.selectedIds, action, labelId)
  showLabelMenu.value = false
  emit('clear')
}

function requestDelete() {
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  showDeleteConfirm.value = false
  await run('trash')
}

const userLabels = () => props.labels.filter((l) => l.type === 'user')
</script>

<template>
  <div
    v-if="selectedIds.length > 0"
    class="flex flex-col bg-forest-50 border-b text-sm flex-shrink-0 relative"
  >
    <!-- 処理中オーバーレイ（プログレスバー） -->
    <div
      v-if="isProcessing"
      class="absolute inset-0 bg-forest-50/90 flex flex-col items-center justify-center gap-2 z-10 px-4"
    >
      <div class="w-full flex items-center gap-2 text-xs text-forest-700">
        <svg class="w-3.5 h-3.5 animate-spin flex-shrink-0 text-forest-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span class="font-medium">{{ progress.processed }}/{{ progress.total }}件処理中</span>
        <span v-if="etaText" class="ml-auto text-gray-500">残り約{{ etaText }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-1.5">
        <div
          class="bg-forest-600 h-1.5 rounded-full transition-[width] duration-300"
          :style="{ width: progressPct + '%' }"
        />
      </div>
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
        class="px-3 h-9 flex items-center rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer text-sm flex-shrink-0"
        @click="requestDelete"
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

  <!-- 削除確認ダイアログ -->
  <div
    v-if="showDeleteConfirm"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="showDeleteConfirm = false"
  >
    <div class="bg-white rounded-xl shadow-2xl mx-6 p-6 max-w-xs w-full">
      <h2 class="text-base font-semibold text-gray-900 mb-1">{{ selectedIds.length }}件を削除</h2>
      <p class="text-sm text-gray-500 mb-5">削除したスレッドはゴミ箱に移動します。よろしいですか？</p>
      <div class="flex gap-2">
        <button
          class="flex-1 min-h-[44px] border rounded text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
          @click="showDeleteConfirm = false"
        >キャンセル</button>
        <button
          class="flex-1 min-h-[44px] bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium cursor-pointer"
          @click="confirmDelete"
        >削除する</button>
      </div>
    </div>
  </div>
</template>
