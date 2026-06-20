<script setup lang="ts">
import type { SenderSummary } from '@/composables/useSenders'

const props = defineProps<{
  senders: SenderSummary[]
  activeSender: string | null
}>()
const emit = defineEmits<{ select: [address: string | null] }>()
</script>

<template>
  <div class="flex flex-col overflow-hidden">
    <div class="px-3 border-b flex items-center justify-between min-h-[44px]">
      <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">送信者</span>
      <button
        v-if="activeSender"
        class="text-sm text-blue-500 hover:text-blue-700 cursor-pointer min-h-[44px] px-3 flex items-center"
        @click="emit('select', null)"
      >クリア</button>
    </div>

    <div class="flex-1 overflow-y-auto min-h-0">
      <div v-if="senders.length === 0" class="px-3 py-4 text-xs text-gray-400 italic">
        読み込み中...
      </div>
      <button
        v-for="s in senders"
        :key="s.address"
        class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 transition-colors"
        :class="activeSender === s.address ? 'bg-blue-50' : ''"
        @click="emit('select', activeSender === s.address ? null : s.address)"
      >
        <!-- アバター -->
        <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
          {{ s.name[0]?.toUpperCase() ?? '?' }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium truncate" :class="activeSender === s.address ? 'text-blue-700' : 'text-gray-800'">
            {{ s.name }}
          </p>
          <p class="text-xs text-gray-400 truncate">{{ s.address }}</p>
        </div>
        <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span class="text-xs text-gray-400">{{ s.count }}</span>
          <span v-if="s.unread > 0" class="text-xs text-blue-500 font-medium">{{ s.unread }}未読</span>
        </div>
      </button>
    </div>
  </div>
</template>
