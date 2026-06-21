<script setup lang="ts">
import { computed } from 'vue'
import type { ThreadListItem } from '@morg/shared'
import { useLabels } from '@/composables/useLabels'

const props = defineProps<{ thread: ThreadListItem; selected: boolean; checked: boolean; selectionMode: boolean }>()
defineEmits<{ click: []; check: [id: string] }>()

const { data: labels } = useLabels()

function formatDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  const sameYear = d.getFullYear() === now.getFullYear()
  if (sameYear) return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

function senderName(from: string): string {
  const match = from.match(/^(.+?)\s*</)
  return match ? match[1].trim().replace(/^"|"$/g, '') : from
}

const LABEL_SKIP = new Set([
  'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS',
])
const LABEL_NAMES: Record<string, string> = {
  INBOX: '受信', SENT: '送信済', DRAFT: '下書き',
  STARRED: 'スター', IMPORTANT: '重要', SPAM: '迷惑', TRASH: 'ゴミ箱',
}
const LABEL_STYLE: Record<string, string> = {
  INBOX:     'bg-blue-100 text-blue-700',
  SENT:      'bg-green-100 text-green-700',
  DRAFT:     'bg-orange-100 text-orange-700',
  STARRED:   'bg-yellow-100 text-yellow-700',
  IMPORTANT: 'bg-yellow-100 text-yellow-800',
  SPAM:      'bg-red-100 text-red-700',
  TRASH:     'bg-gray-200 text-gray-500',
}

const displayLabels = computed(() => {
  const userMap = new Map(labels.value?.map((l) => [l.id, l.name]) ?? [])
  return props.thread.labelIds
    .filter((id) => !LABEL_SKIP.has(id) && !id.startsWith('CATEGORY_'))
    .map((id) => ({
      id,
      name: LABEL_NAMES[id] ?? userMap.get(id) ?? id,
      style: LABEL_STYLE[id] ?? 'bg-purple-100 text-purple-700',
    }))
    .slice(0, 5)
})
</script>

<template>
  <div
    class="flex items-stretch border-b transition-colors"
    :class="checked ? 'bg-blue-50' : selected ? 'bg-blue-50' : 'hover:bg-gray-50'"
  >
    <!-- チェック領域：タップしやすい広いエリア -->
    <button
      class="flex items-center justify-center w-12 flex-shrink-0 cursor-pointer"
      :aria-label="checked ? '選択解除' : '選択'"
      @click.stop="$emit('check', thread.threadId)"
    >
      <div
        v-if="checked"
        class="w-5 h-5 rounded bg-blue-500 flex items-center justify-center"
      >
        <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div
        v-else
        class="w-5 h-5 rounded border-2 flex items-center justify-center"
        :class="thread.unread ? 'border-blue-400 bg-blue-50' : 'border-gray-300'"
      >
        <div v-if="thread.unread" class="w-2 h-2 rounded-full bg-blue-500" />
      </div>
    </button>

    <!-- メール情報：選択中はチェック切替、通常はスレッド開く -->
    <div
      class="flex-1 min-w-0 py-1.5 pr-3 cursor-pointer"
      @click="selectionMode ? $emit('check', thread.threadId) : $emit('click')"
    >
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-sm truncate" :class="thread.unread ? 'font-semibold text-gray-900' : 'text-gray-700'">
          {{ senderName(thread.from) || '(送信者不明)' }}
        </span>
        <span class="text-xs text-gray-400 flex-shrink-0">{{ formatDate(thread.date) }}</span>
      </div>
      <p class="text-sm truncate leading-tight" :class="thread.unread ? 'font-medium text-gray-900' : 'text-gray-600'">
        {{ thread.subject }}
      </p>
      <p class="text-xs text-gray-400 truncate leading-tight">{{ thread.snippet }}</p>
      <div v-if="displayLabels.length" class="flex flex-wrap gap-1 mt-0.5">
        <span
          v-for="label in displayLabels"
          :key="label.id"
          class="text-xs px-1.5 py-px rounded-full"
          :class="label.style"
        >{{ label.name }}</span>
      </div>
    </div>
  </div>
</template>
