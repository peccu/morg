<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThread } from '@/composables/useThread'
import { useBulkAction } from '@/composables/useBulkAction'
import { extractBody } from '@/lib/mail-body'
import type { BatchAction } from '@morg/shared'
import type { GmailMessagePart, GmailMessageHeader } from '@morg/shared'

const route  = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)
const { data: thread, isPending, isError } = useThread(id)
const { execute, isProcessing } = useBulkAction()

function header(headers: GmailMessageHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function parseEmail(from: string): string {
  const m = from.match(/<([^>]+)>/)
  return m ? m[1].trim() : from.trim()
}

function parseName(from: string): string {
  const m = from.match(/^(.+?)\s*</)
  return m ? m[1].trim().replace(/^"|"$/g, '') : from.trim()
}

const firstFrom = computed(() =>
  header(thread.value?.messages[0]?.payload?.headers ?? [], 'From'),
)
const senderEmail = computed(() => parseEmail(firstFrom.value))
const senderName  = computed(() => parseName(firstFrom.value) || senderEmail.value)

async function runAction(action: BatchAction) {
  await execute([id.value], action)
  router.back()
}

function goToSender() {
  router.push({ name: 'inbox', query: { sender: senderEmail.value } })
}
</script>

<template>
  <div class="h-dvh flex flex-col bg-white overflow-hidden">
    <!-- ヘッダー -->
    <header class="border-b flex items-center gap-2 px-3 flex-shrink-0 safe-top min-h-[44px]">
      <button
        class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 cursor-pointer min-h-[44px] pr-2"
        @click="router.back()"
      >← 戻る</button>
    </header>

    <!-- アクションバー -->
    <div
      v-if="thread"
      class="border-b flex items-center gap-1 px-2 flex-shrink-0 min-h-[44px] bg-gray-50 relative"
    >
      <!-- 処理中オーバーレイ -->
      <div
        v-if="isProcessing"
        class="absolute inset-0 bg-gray-50/80 flex items-center justify-center gap-2 z-10"
      >
        <svg class="w-4 h-4 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span class="text-sm text-blue-700 font-medium">処理中...</span>
      </div>

      <button
        :disabled="isProcessing"
        class="px-3 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
        @click="runAction('archive')"
      >アーカイブ</button>

      <button
        :disabled="isProcessing"
        class="px-3 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
        @click="runAction('trash')"
      >削除</button>

      <button
        :disabled="isProcessing"
        class="px-3 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
        @click="runAction('markRead')"
      >既読</button>

      <button
        :disabled="isProcessing"
        class="px-3 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
        @click="runAction('markUnread')"
      >未読</button>

      <!-- 送信者で検索 -->
      <button
        v-if="senderEmail"
        :disabled="isProcessing"
        class="ml-auto flex items-center gap-1 min-h-[44px] px-3 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 cursor-pointer max-w-[45%]"
        @click="goToSender"
      >
        <span class="truncate">{{ senderName }}</span>
        <span class="flex-shrink-0">→</span>
      </button>
    </div>

    <main class="flex-1 overflow-y-auto min-h-0">
      <div v-if="isPending" class="p-8 text-center text-gray-400">読み込み中...</div>
      <div v-else-if="isError" class="p-8 text-center text-red-400">取得に失敗しました</div>

      <div v-else-if="thread" class="max-w-4xl mx-auto px-3 py-4">
        <!-- スレッドタイトル -->
        <h1 class="text-lg font-semibold text-gray-900 mb-4">
          {{ header(thread.messages[0]?.payload?.headers ?? [], 'Subject') || '(件名なし)' }}
        </h1>

        <!-- メッセージ一覧 -->
        <div class="space-y-4">
          <article
            v-for="msg in thread.messages"
            :key="msg.id"
            class="border rounded-lg overflow-hidden"
          >
            <!-- メッセージヘッダー -->
            <div class="bg-gray-50 px-3 py-2 border-b">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ header(msg.payload?.headers ?? [], 'From') }}
                  </p>
                  <p class="text-xs text-gray-500 mt-0.5 truncate">
                    To: {{ header(msg.payload?.headers ?? [], 'To') }}
                  </p>
                </div>
                <time class="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                  {{ header(msg.payload?.headers ?? [], 'Date') }}
                </time>
              </div>
            </div>

            <!-- メッセージ本文 -->
            <div class="px-3 py-3 overflow-x-auto">
              <div
                v-if="msg.payload"
                class="mail-body min-w-0 text-sm text-gray-800 max-w-full"
                style="word-break: break-word; overflow-wrap: break-word;"
                v-html="extractBody(msg.payload as GmailMessagePart).html || msg.snippet"
              />
            </div>
          </article>
        </div>
      </div>
    </main>
  </div>
</template>
