<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThread } from '@/composables/useThread'
import { useBulkAction } from '@/composables/useBulkAction'
import { useMessageAction } from '@/composables/useMessageAction'
import { extractBody } from '@/lib/mail-body'
import type { BatchAction } from '@morg/shared'
import type { GmailMessagePart, GmailMessageHeader } from '@morg/shared'

const route  = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)
const { data: thread, isPending, isError } = useThread(id)

// スレッド全体へのアクション
const { execute: execThread, isProcessing: threadProcessing } = useBulkAction()
// 選択メッセージへのアクション
const { execute: execMsg, isProcessing: msgProcessing } = useMessageAction(() => id.value)

const isProcessing = computed(() => threadProcessing.value || msgProcessing.value)

// メッセージ選択状態
const checkedMsgIds = ref(new Set<string>())

function toggleMsg(msgId: string) {
  const next = new Set(checkedMsgIds.value)
  next.has(msgId) ? next.delete(msgId) : next.add(msgId)
  checkedMsgIds.value = next
}
function clearMsgs() { checkedMsgIds.value = new Set() }

// ──── ヘッダー解析ユーティリティ ────
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

// ──── アクション ────
async function runThreadAction(action: BatchAction) {
  await execThread([id.value], action)
  router.back()
}

async function runMsgAction(action: BatchAction) {
  await execMsg([...checkedMsgIds.value], action)
  clearMsgs()
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

    <!-- スレッドレベルアクションバー -->
    <div
      v-if="thread"
      class="border-b flex items-center gap-1 px-2 flex-shrink-0 min-h-[44px] bg-gray-50 relative"
    >
      <div v-if="isProcessing" class="absolute inset-0 bg-gray-50/80 flex items-center justify-center gap-2 z-10">
        <svg class="w-4 h-4 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span class="text-sm text-blue-700 font-medium">処理中...</span>
      </div>

      <span class="text-xs text-gray-400 flex-shrink-0">全体:</span>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runThreadAction('archive')">アーカイブ</button>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runThreadAction('trash')">削除</button>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runThreadAction('markRead')">既読</button>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runThreadAction('markUnread')">未読</button>

      <button
        v-if="senderEmail"
        :disabled="isProcessing"
        class="ml-auto flex items-center gap-1 min-h-[44px] px-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 cursor-pointer max-w-[40%]"
        @click="goToSender"
      >
        <span class="truncate">{{ senderName }}</span>
        <span class="flex-shrink-0">→</span>
      </button>
    </div>

    <!-- 選択メッセージ用アクションバー -->
    <div
      v-if="checkedMsgIds.size > 0"
      class="border-b flex items-center gap-1 px-2 flex-shrink-0 min-h-[44px] bg-blue-50 relative"
    >
      <div v-if="isProcessing" class="absolute inset-0 bg-blue-50/80 flex items-center justify-center gap-2 z-10">
        <svg class="w-4 h-4 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>

      <span class="text-xs text-blue-700 font-medium">{{ checkedMsgIds.size }}件選択</span>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runMsgAction('archive')">アーカイブ</button>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runMsgAction('trash')">削除</button>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runMsgAction('markRead')">既読</button>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runMsgAction('markUnread')">未読</button>
      <button class="ml-auto w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer" @click="clearMsgs">✕</button>
    </div>

    <main class="flex-1 overflow-y-auto min-h-0">
      <div v-if="isPending" class="p-8 text-center text-gray-400">読み込み中...</div>
      <div v-else-if="isError" class="p-8 text-center text-red-400">取得に失敗しました</div>

      <div v-else-if="thread" class="max-w-4xl mx-auto px-3 py-4">
        <h1 class="text-lg font-semibold text-gray-900 mb-4">
          {{ header(thread.messages[0]?.payload?.headers ?? [], 'Subject') || '(件名なし)' }}
        </h1>

        <div class="space-y-4">
          <article
            v-for="msg in thread.messages"
            :key="msg.id"
            class="border rounded-lg overflow-hidden"
            :class="checkedMsgIds.has(msg.id) ? 'ring-2 ring-blue-400' : ''"
          >
            <!-- メッセージヘッダー（チェック付き） -->
            <div
              class="bg-gray-50 border-b flex items-stretch cursor-pointer select-none"
              @click="toggleMsg(msg.id)"
            >
              <!-- チェックボックスタップ領域 -->
              <div class="flex items-center justify-center w-12 flex-shrink-0 min-h-[44px]">
                <div
                  class="w-5 h-5 rounded border-2 flex items-center justify-center"
                  :class="checkedMsgIds.has(msg.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-400'"
                >
                  <svg v-if="checkedMsgIds.has(msg.id)" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <div class="flex-1 min-w-0 py-2 pr-3">
                <div class="flex items-start justify-between gap-3">
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
