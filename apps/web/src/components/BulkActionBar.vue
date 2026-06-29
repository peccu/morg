<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useTaskQueueStore } from '@/stores/taskQueue'
import type { BatchAction } from '@morg/shared'
import type { LabelItem } from '@/composables/useLabels'

const props = defineProps<{ selectedIds: string[]; labels: LabelItem[] }>()
const emit = defineEmits<{ clear: [] }>()

const taskQueue = useTaskQueueStore()
const route = useRoute()
const { t } = useI18n()

const showLabelMenu = ref(false)
const showDeleteConfirm = ref(false)

function run(action: BatchAction, labelId?: string) {
  const actionNames: Record<string, string> = {
    archive: t('actions.archive'),
    trash: t('actions.delete'),
    markRead: t('actions.markRead'),
    markUnread: t('actions.markUnread'),
    addLabel: props.labels.find(l => l.id === labelId)?.name ?? t('bulk.label'),
  }
  const label = `${actionNames[action] ?? action} (${props.selectedIds.length})`
  taskQueue.enqueue({
    action,
    threadIds: [...props.selectedIds],
    labelId,
    label,
    originPath: route.fullPath,
  })
  showLabelMenu.value = false
  emit('clear')
}

function requestDelete() {
  showDeleteConfirm.value = true
}

function confirmDelete() {
  showDeleteConfirm.value = false
  run('trash')
}

const userLabels = () => props.labels.filter((l) => l.type === 'user')
</script>

<template>
  <div
    v-if="selectedIds.length > 0"
    class="flex flex-col bg-forest-50 border-b text-sm flex-shrink-0 relative"
  >
    <!-- 1行目: 件数 + ラベル + 閉じるボタン -->
    <div class="flex items-center px-2 pt-1 pb-0.5 relative">
      <span class="text-forest-700 font-medium text-xs">{{ t('bulk.selectedCount', { n: selectedIds.length }) }}</span>

      <!-- ラベル追加ドロップダウン（overflow-x-autoの外に置くためrow1に配置） -->
      <div class="relative ml-auto mr-1">
        <button
          :disabled="userLabels().length === 0"
          class="px-2 h-8 flex items-center rounded bg-white border hover:bg-gray-50 disabled:opacity-50 cursor-pointer text-xs"
          @click="showLabelMenu = !showLabelMenu"
        >{{ t('bulk.label') }}</button>
        <div
          v-if="showLabelMenu"
          class="absolute right-0 top-full mt-1 z-50 bg-white border rounded shadow-lg min-w-36 py-1"
        >
          <button
            v-for="l in userLabels()"
            :key="l.id"
            class="w-full text-left px-4 min-h-[44px] flex items-center text-sm hover:bg-gray-50 cursor-pointer"
            @click="run('addLabel', l.id)"
          >{{ l.name }}</button>
        </div>
      </div>

      <button
        class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer text-base"
        @click="showLabelMenu = false; emit('clear')"
      >✕</button>
    </div>

    <!-- 2行目: アクションボタン（横スクロール） -->
    <div class="flex items-center gap-1.5 px-2 pb-2 overflow-x-auto">
      <button
        class="px-3 h-9 flex items-center rounded bg-white border hover:bg-gray-50 cursor-pointer text-sm flex-shrink-0"
        @click="run('archive')"
      >{{ t('actions.archive') }}</button>

      <button
        class="px-3 h-9 flex items-center rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer text-sm flex-shrink-0"
        @click="requestDelete"
      >{{ t('actions.delete') }}</button>

      <button
        class="px-3 h-9 flex items-center rounded bg-white border hover:bg-gray-50 cursor-pointer text-sm flex-shrink-0"
        @click="run('markRead')"
      >{{ t('actions.markRead') }}</button>

      <button
        class="px-3 h-9 flex items-center rounded bg-white border hover:bg-gray-50 cursor-pointer text-sm flex-shrink-0"
        @click="run('markUnread')"
      >{{ t('actions.markUnread') }}</button>
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
      <h2 class="text-base font-semibold text-gray-900 mb-1">{{ t('bulk.deleteTitle', { n: selectedIds.length }) }}</h2>
      <p class="text-sm text-gray-500 mb-5">{{ t('bulk.deleteConfirm') }}</p>
      <div class="flex gap-2">
        <button
          class="flex-1 min-h-[44px] border rounded text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
          @click="showDeleteConfirm = false"
        >{{ t('actions.cancel') }}</button>
        <button
          class="flex-1 min-h-[44px] bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium cursor-pointer"
          @click="confirmDelete"
        >{{ t('actions.doDelete') }}</button>
      </div>
    </div>
  </div>
</template>
