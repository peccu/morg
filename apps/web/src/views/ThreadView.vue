<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThread } from '@/composables/useThread'
import { useBulkAction } from '@/composables/useBulkAction'
import { useMessageAction } from '@/composables/useMessageAction'
import { useLabels } from '@/composables/useLabels'
import { usePluginsStore } from '@/stores/plugins'
import { useAppAPI } from '@/composables/useAppAPI'
import { extractBody } from '@/lib/mail-body'
import type { BatchAction } from '@morg/shared'
import type { GmailMessagePart, GmailMessageHeader } from '@morg/shared'
import type { Plugin, ThreadAction } from '@/plugins/types'

const route  = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)
const { data: thread, isPending, isError } = useThread(id)

// スレッド全体へのアクション
const { execute: execThread, isProcessing: threadProcessing } = useBulkAction()
const { execute: execMsg, isProcessing: msgProcessing } = useMessageAction(() => id.value)
const { data: labels } = useLabels()

const LABEL_SKIP = new Set([
  'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS',
])
const LABEL_NAMES: Record<string, string> = {
  INBOX: '受信', SENT: '送信済', DRAFT: '下書き',
  STARRED: 'スター', IMPORTANT: '重要', SPAM: '迷惑', TRASH: 'ゴミ箱',
}
const LABEL_STYLE: Record<string, string> = {
  INBOX:     'bg-forest-100 text-forest-700',
  SENT:      'bg-green-100 text-green-700',
  DRAFT:     'bg-orange-100 text-orange-700',
  STARRED:   'bg-yellow-100 text-yellow-700',
  IMPORTANT: 'bg-yellow-100 text-yellow-800',
  SPAM:      'bg-red-100 text-red-700',
  TRASH:     'bg-gray-200 text-gray-500',
}

function msgLabels(labelIds: string[]) {
  const userMap = new Map(labels.value?.map((l) => [l.id, l.name]) ?? [])
  return labelIds
    .filter((id) => !LABEL_SKIP.has(id) && !id.startsWith('CATEGORY_'))
    .map((id) => ({
      id,
      name: LABEL_NAMES[id] ?? userMap.get(id) ?? id,
      style: LABEL_STYLE[id] ?? 'bg-purple-100 text-purple-700',
    }))
}

const isProcessing = computed(() => threadProcessing.value || msgProcessing.value)

const pluginsStore = usePluginsStore()
const appAPI = useAppAPI()

const pluginThreadActions = computed(() =>
  pluginsStore.enabledPlugins.flatMap((plugin) =>
    (plugin.threadActions ?? [])
      .filter((action) => !action.visible || (thread.value && action.visible({
        threadId: id.value,
        thread: thread.value,
        config: pluginsStore.getConfig(plugin.id),
        app: appAPI,
      })))
      .map((action) => ({ action, plugin }))
  )
)

async function runPluginAction(plugin: Plugin, action: ThreadAction) {
  if (!thread.value) return
  try {
    await action.run({
      threadId: id.value,
      thread: thread.value,
      config: pluginsStore.getConfig(plugin.id),
      app: appAPI,
    })
  } catch (e) {
    appAPI.notify(e instanceof Error ? e.message : '操作に失敗しました', 'error')
  }
}

// メッセージ選択状態
const checkedMsgIds = ref(new Set<string>())

// 横スクロールモード（per-message）
const scrollMsgIds = ref(new Set<string>())
function toggleScrollMode(msgId: string) {
  const next = new Set(scrollMsgIds.value)
  next.has(msgId) ? next.delete(msgId) : next.add(msgId)
  scrollMsgIds.value = next
}

// HTMLメール内リンクを新しいタブで開く
function onMailClick(e: MouseEvent) {
  const a = (e.target as HTMLElement).closest('a')
  if (!a) return
  const { href } = a
  if (href.startsWith('http://') || href.startsWith('https://')) {
    e.preventDefault()
    window.open(href, '_blank', 'noopener,noreferrer')
  }
}

// メッセージ本文キャッシュ（v-for 内で extractBody を複数呼びしない）
const msgBodies = computed(() => {
  const map = new Map<string, { html: string; isHtml: boolean }>()
  for (const msg of thread.value?.messages ?? []) {
    if (msg.payload) map.set(msg.id, extractBody(msg.payload as GmailMessagePart))
  }
  return map
})

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
function formatDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  const now = new Date()
  const sameYear = d.getFullYear() === now.getFullYear()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  if (sameYear) return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })
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
      class="border-b flex items-center flex-shrink-0 min-h-[44px] bg-gray-50 relative"
    >
      <div v-if="isProcessing" class="absolute inset-0 bg-gray-50/80 flex items-center justify-center gap-2 z-10">
        <svg class="w-4 h-4 animate-spin text-forest-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span class="text-sm text-forest-700 font-medium">処理中...</span>
      </div>

      <!-- ボタン群: 横スクロール可能 -->
      <div class="flex items-center gap-1 px-2 overflow-x-auto flex-1 min-w-0">
        <span class="text-xs text-gray-400 flex-shrink-0">全体:</span>
        <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex-shrink-0" @click="runThreadAction('archive')">アーカイブ</button>
        <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex-shrink-0" @click="runThreadAction('trash')">削除</button>
        <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex-shrink-0" @click="runThreadAction('markRead')">既読</button>
        <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex-shrink-0" @click="runThreadAction('markUnread')">未読</button>

        <template v-if="pluginThreadActions.length > 0">
          <div class="w-px h-5 bg-gray-300 flex-shrink-0" />
          <button
            v-for="{ action, plugin } in pluginThreadActions"
            :key="`${plugin.id}-${action.id}`"
            :disabled="isProcessing"
            class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer whitespace-nowrap flex-shrink-0"
            @click="runPluginAction(plugin, action)"
          >{{ action.label }}</button>
        </template>
      </div>

      <!-- 送信者ボタン: 右端に固定 -->
      <button
        v-if="senderEmail"
        :disabled="isProcessing"
        class="flex-shrink-0 flex items-center gap-1 min-h-[44px] px-2 text-sm text-forest-600 hover:text-forest-800 disabled:opacity-50 cursor-pointer max-w-[40%] border-l"
        @click="goToSender"
      >
        <span class="truncate">{{ senderName }}</span>
        <span class="flex-shrink-0">→</span>
      </button>
    </div>

    <!-- 選択メッセージ用アクションバー -->
    <div
      v-if="checkedMsgIds.size > 0"
      class="border-b flex items-center gap-1 px-2 flex-shrink-0 min-h-[44px] bg-forest-50 relative"
    >
      <div v-if="isProcessing" class="absolute inset-0 bg-forest-50/80 flex items-center justify-center gap-2 z-10">
        <svg class="w-4 h-4 animate-spin text-forest-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>

      <span class="text-xs text-forest-700 font-medium">{{ checkedMsgIds.size }}件選択</span>
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
            :class="checkedMsgIds.has(msg.id) ? 'ring-2 ring-forest-400' : ''"
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
                  :class="checkedMsgIds.has(msg.id) ? 'bg-forest-600 border-forest-600' : 'border-gray-400'"
                >
                  <svg v-if="checkedMsgIds.has(msg.id)" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <div class="flex-1 min-w-0 py-2 pr-3">
                <div class="flex items-baseline justify-between gap-2">
                  <p class="text-sm font-medium text-gray-900 truncate min-w-0">
                    {{ header(msg.payload?.headers ?? [], 'From') }}
                  </p>
                  <time class="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                    {{ formatDate(header(msg.payload?.headers ?? [], 'Date')) }}
                  </time>
                </div>
                <p class="text-xs text-gray-500 mt-0.5 truncate">
                  To: {{ header(msg.payload?.headers ?? [], 'To') }}
                </p>
                <div v-if="msgLabels(msg.labelIds ?? []).length" class="flex flex-wrap gap-1 mt-1.5">
                  <span
                    v-for="label in msgLabels(msg.labelIds ?? [])"
                    :key="label.id"
                    class="text-xs px-1.5 py-0.5 rounded-full"
                    :class="label.style"
                  >{{ label.name }}</span>
                </div>
              </div>
            </div>

            <!-- メッセージ本文 -->
            <div>
              <!-- 横幅モード切替（HTMLメールのみ） -->
              <div v-if="msgBodies.get(msg.id)?.isHtml" class="flex justify-end px-3 pt-2">
                <button
                  class="text-xs border rounded px-2 py-0.5 cursor-pointer flex-shrink-0"
                  :class="scrollMsgIds.has(msg.id) ? 'text-forest-700 border-forest-400 bg-forest-50' : 'text-gray-400 border-gray-300 hover:text-gray-600'"
                  @click.stop="toggleScrollMode(msg.id)"
                >{{ scrollMsgIds.has(msg.id) ? '縮小' : '↔ 横スクロール' }}</button>
              </div>
              <!-- mail-body.mail-scroll が自身 overflow-x:auto になるため外側ラッパー不要 -->
              <div
                v-if="msg.payload"
                class="mail-body text-sm text-gray-800 px-3 py-3"
                :class="scrollMsgIds.has(msg.id) ? 'mail-scroll' : 'min-w-0 max-w-full'"
                :style="scrollMsgIds.has(msg.id) ? undefined : 'word-break:break-word;overflow-wrap:break-word'"
                v-html="msgBodies.get(msg.id)?.html || msg.snippet"
                @click="onMailClick"
              />
            </div>
          </article>
        </div>
      </div>
    </main>
  </div>
</template>
