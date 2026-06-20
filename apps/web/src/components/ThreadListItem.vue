<script setup lang="ts">
import type { ThreadListItem } from '@morg/shared'

const props = defineProps<{ thread: ThreadListItem; selected: boolean; checked: boolean }>()
defineEmits<{ click: []; check: [id: string] }>()

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

    <!-- メール情報：タップでスレッド開く -->
    <div
      class="flex-1 min-w-0 py-3 pr-4 cursor-pointer"
      @click="$emit('click')"
    >
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-sm truncate" :class="thread.unread ? 'font-semibold text-gray-900' : 'text-gray-700'">
          {{ senderName(thread.from) || '(送信者不明)' }}
        </span>
        <span class="text-xs text-gray-400 flex-shrink-0">{{ formatDate(thread.date) }}</span>
      </div>
      <p class="text-sm truncate mt-0.5" :class="thread.unread ? 'font-medium text-gray-900' : 'text-gray-600'">
        {{ thread.subject }}
      </p>
      <p class="text-xs text-gray-400 truncate mt-0.5">{{ thread.snippet }}</p>
    </div>
  </div>
</template>
