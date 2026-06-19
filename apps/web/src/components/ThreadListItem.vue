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
    class="flex items-start gap-3 px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors"
    :class="{
      'bg-blue-50 hover:bg-blue-50': selected,
      'font-semibold': thread.unread,
    }"
    @click="$emit('click')"
  >
    <!-- チェックボックス / 未読インジケーター -->
    <div class="mt-1 flex-shrink-0 w-5 h-5 flex items-center justify-center">
      <input
        v-if="checked || selected"
        type="checkbox"
        :checked="checked"
        class="w-4 h-4 cursor-pointer"
        @click.stop="$emit('check', thread.threadId)"
      />
      <div
        v-else
        class="w-2 h-2 rounded-full"
        :class="thread.unread ? 'bg-blue-500' : 'bg-transparent'"
        @click.stop="$emit('check', thread.threadId)"
      />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-sm truncate" :class="thread.unread ? 'text-gray-900' : 'text-gray-700'">
          {{ senderName(thread.from) || '(送信者不明)' }}
        </span>
        <span class="text-xs text-gray-400 flex-shrink-0">{{ formatDate(thread.date) }}</span>
      </div>
      <p class="text-sm truncate mt-0.5" :class="thread.unread ? 'text-gray-900' : 'text-gray-600'">
        {{ thread.subject }}
      </p>
      <p class="text-xs text-gray-400 truncate mt-0.5">{{ thread.snippet }}</p>
    </div>
  </div>
</template>
