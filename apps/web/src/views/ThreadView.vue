<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted, type ComponentPublicInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
import { useTaskQueueStore } from '@/stores/taskQueue'

const route  = useRoute()
const router = useRouter()
const { t, te, locale } = useI18n()
const id = computed(() => route.params.id as string)
const { data: thread, isPending, isError, error: threadError } = useThread(id)

// スレッド全体へのアクション
const { execute: execThread, isProcessing: threadProcessing } = useBulkAction()
const { execute: execMsg, isProcessing: msgProcessing } = useMessageAction(() => id.value)
const { data: labels } = useLabels()

const LABEL_SKIP = new Set([
  'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS',
])
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
      name: te(`labels.${id}`) ? t(`labels.${id}`) : (userMap.get(id) ?? id),
      style: LABEL_STYLE[id] ?? 'bg-purple-100 text-purple-700',
    }))
}

const taskQueueStore = useTaskQueueStore()
const isProcessing = computed(
  () => threadProcessing.value || msgProcessing.value || taskQueueStore.processingThreadIds.has(id.value),
)

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
    appAPI.notify(e instanceof Error ? e.message : t('actions.operationFailed'), 'error')
  }
}

// 削除確認ダイアログ
const showThreadDeleteConfirm = ref(false)
const showMsgDeleteConfirm = ref(false)

// メッセージ選択状態
const checkedMsgIds = ref(new Set<string>())

// 横スクロールモード（per-message）
const scrollMsgIds = ref(new Set<string>())
function toggleScrollMode(msgId: string) {
  const next = new Set(scrollMsgIds.value)
  next.has(msgId) ? next.delete(msgId) : next.add(msgId)
  scrollMsgIds.value = next
  nextTick(() => applyMailZoom(msgId))
}

// CSS zoom によるスケール縮小（per-message）
// 自然幅のまま描画したメールを、コンテナ幅に合わせて zoom でスケールダウンする。
// zoom はレイアウトサイズも変えるため overflow や高さ補正が不要。
const mailBodyRefs = new Map<string, HTMLElement>()

function setMailBodyRef(msgId: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) {
    mailBodyRefs.set(msgId, el)
    nextTick(() => applyMailZoom(msgId))
  } else {
    mailBodyRefs.delete(msgId)
  }
}

function applyMailZoom(msgId: string) {
  const el = mailBodyRefs.get(msgId)
  if (!el) return

  if (scrollMsgIds.value.has(msgId)) {
    el.style.zoom = ''
    return
  }

  // zoom を 1 にリセットして自然幅を計測し、zoom を算出して適用する。
  // nextTick 内で実行されるため、ブラウザの paint より前に完了し視覚的なチラつきは発生しない。
  el.style.zoom = '1'
  const naturalWidth = el.scrollWidth
  const containerWidth = el.parentElement?.offsetWidth ?? naturalWidth

  el.style.zoom = naturalWidth > containerWidth
    ? String(containerWidth / naturalWidth)
    : ''
}

function reapplyAllZooms() {
  for (const msgId of mailBodyRefs.keys()) applyMailZoom(msgId)
}

onMounted(() => window.addEventListener('resize', reapplyAllZooms))
onUnmounted(() => window.removeEventListener('resize', reapplyAllZooms))

// メール本文を Blob URL で新規タブに流し込む
function openInNewTab(msgId: string) {
  const body = msgBodies.value.get(msgId)
  if (!body?.html) return
  // スコープ済みの html を .mail-body div で包んでスタイルが効くようにする
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:16px;} .mail-body{max-width:100%;}</style>
</head>
<body><div class="mail-body">${body.html}</div></body>
</html>`
  const blob = new Blob([fullHtml], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 30000)
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
  const loc = locale.value === 'en' ? 'en-US' : 'ja-JP'
  const now = new Date()
  const sameYear = d.getFullYear() === now.getFullYear()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false })
  if (sameYear) return d.toLocaleString(loc, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  return d.toLocaleString(loc, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
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

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => appAPI.notify(t('status.copied'), 'success'))
}
</script>

<template>
  <div class="h-dvh flex flex-col bg-white overflow-hidden">
    <!-- ヘッダー -->
    <header class="border-b flex items-center gap-2 safe-left pr-3 flex-shrink-0 safe-top min-h-[44px] app-titlebar">
      <button
        class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 cursor-pointer min-h-[44px] pr-2"
        @click="router.back()"
      >{{ t('actions.back') }}</button>
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
        <span class="text-sm text-forest-700 font-medium">{{ t('status.processing') }}</span>
      </div>

      <!-- ボタン群: 横スクロール可能 -->
      <div class="flex items-center gap-1 px-2 overflow-x-auto flex-1 min-w-0">
        <span class="text-xs text-gray-400 flex-shrink-0">{{ t('thread.all') }}</span>
        <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex-shrink-0" @click="runThreadAction('archive')">{{ t('actions.archive') }}</button>
        <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex-shrink-0" @click="showThreadDeleteConfirm = true">{{ t('actions.delete') }}</button>
        <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex-shrink-0" @click="runThreadAction('markRead')">{{ t('actions.markRead') }}</button>
        <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer flex-shrink-0" @click="runThreadAction('markUnread')">{{ t('actions.markUnread') }}</button>

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

      <span class="text-xs text-forest-700 font-medium">{{ t('thread.msgSelected', { n: checkedMsgIds.size }) }}</span>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runMsgAction('archive')">{{ t('actions.archive') }}</button>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="showMsgDeleteConfirm = true">{{ t('actions.delete') }}</button>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runMsgAction('markRead')">{{ t('actions.markRead') }}</button>
      <button :disabled="isProcessing" class="px-2.5 min-h-[44px] flex items-center text-sm rounded bg-white border hover:bg-gray-100 disabled:opacity-50 cursor-pointer" @click="runMsgAction('markUnread')">{{ t('actions.markUnread') }}</button>
      <button class="ml-auto w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer" @click="clearMsgs">✕</button>
    </div>

    <main class="flex-1 overflow-y-auto min-h-0">
      <div v-if="isPending" class="p-8 text-center text-gray-400">{{ t('status.loading') }}</div>
      <div v-else-if="isError" class="p-8 text-center text-red-400">
        <p class="font-medium">{{ t('status.fetchError') }}</p>
        <pre v-if="threadError?.message" class="mt-2 text-xs text-left whitespace-pre-wrap break-all bg-red-50 rounded p-3 max-w-sm mx-auto">{{ threadError.message }}</pre>
        <button
          v-if="threadError?.message"
          class="mt-2 text-xs px-2 py-1 border border-red-300 rounded hover:bg-red-50 cursor-pointer"
          @click="copyText(threadError?.message ?? '')"
        >{{ t('actions.copy') }}</button>
      </div>

      <div v-else-if="thread" class="max-w-4xl mx-auto px-3 py-4">
        <h1 class="text-lg font-semibold text-gray-900 mb-4">
          {{ header(thread.messages[0]?.payload?.headers ?? [], 'Subject') || t('thread.noSubject') }}
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
                  {{ t('thread.to') }} {{ header(msg.payload?.headers ?? [], 'To') }}
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
              <!-- 本文ツールバー（本文あるメッセージのみ） -->
              <div v-if="msgBodies.has(msg.id)" class="flex justify-end items-center gap-1 px-3 pt-2">
                <!-- 新規タブで開く -->
                <button
                  class="text-xs border rounded px-2 py-0.5 cursor-pointer flex-shrink-0 text-gray-400 border-gray-300 hover:text-gray-600 flex items-center gap-1"
                  :title="t('thread.openInTab')"
                  @click.stop="openInNewTab(msg.id)"
                >
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {{ t('thread.openInTab') }}
                </button>
                <!-- 横スクロール/縮小（HTMLメールのみ） -->
                <button
                  v-if="msgBodies.get(msg.id)?.isHtml"
                  class="text-xs border rounded px-2 py-0.5 cursor-pointer flex-shrink-0"
                  :class="scrollMsgIds.has(msg.id) ? 'text-forest-700 border-forest-400 bg-forest-50' : 'text-gray-400 border-gray-300 hover:text-gray-600'"
                  @click.stop="toggleScrollMode(msg.id)"
                >{{ scrollMsgIds.has(msg.id) ? t('thread.shrink') : t('thread.scrollHorizontal') }}</button>
              </div>
              <div
                v-if="msg.payload"
                class="mail-body text-sm text-gray-800 px-3 py-3"
                :class="scrollMsgIds.has(msg.id) ? 'mail-scroll' : ''"
                :ref="(el) => setMailBodyRef(msg.id, el)"
                v-html="msgBodies.get(msg.id)?.html || msg.snippet"
                @click="onMailClick"
              />
            </div>
          </article>
        </div>
      </div>
    </main>

    <!-- スレッド削除確認ダイアログ -->
    <div
      v-if="showThreadDeleteConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showThreadDeleteConfirm = false"
    >
      <div class="bg-white rounded-xl shadow-2xl mx-6 p-6 max-w-xs w-full">
        <h2 class="text-base font-semibold text-gray-900 mb-1">{{ t('bulk.deleteTitle', { n: 1 }) }}</h2>
        <p class="text-sm text-gray-500 mb-5">{{ t('bulk.deleteConfirm') }}</p>
        <div class="flex gap-2">
          <button
            class="flex-1 min-h-[44px] border rounded text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
            @click="showThreadDeleteConfirm = false"
          >{{ t('actions.cancel') }}</button>
          <button
            class="flex-1 min-h-[44px] bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium cursor-pointer"
            @click="showThreadDeleteConfirm = false; runThreadAction('trash')"
          >{{ t('actions.doDelete') }}</button>
        </div>
      </div>
    </div>

    <!-- メッセージ削除確認ダイアログ -->
    <div
      v-if="showMsgDeleteConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showMsgDeleteConfirm = false"
    >
      <div class="bg-white rounded-xl shadow-2xl mx-6 p-6 max-w-xs w-full">
        <h2 class="text-base font-semibold text-gray-900 mb-1">{{ t('thread.deleteMsgTitle', { n: checkedMsgIds.size }) }}</h2>
        <p class="text-sm text-gray-500 mb-5">{{ t('bulk.deleteConfirm') }}</p>
        <div class="flex gap-2">
          <button
            class="flex-1 min-h-[44px] border rounded text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
            @click="showMsgDeleteConfirm = false"
          >{{ t('actions.cancel') }}</button>
          <button
            class="flex-1 min-h-[44px] bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium cursor-pointer"
            @click="showMsgDeleteConfirm = false; runMsgAction('trash')"
          >{{ t('actions.doDelete') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
