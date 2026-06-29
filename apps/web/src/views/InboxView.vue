<script setup lang="ts">
import { ref, computed, watch, defineComponent, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useThreads } from '@/composables/useThreads'
import { useSenders } from '@/composables/useSenders'
import { useLabels } from '@/composables/useLabels'
import ThreadList from '@/components/ThreadList.vue'
import BulkActionBar from '@/components/BulkActionBar.vue'
import SenderPanel from '@/components/SenderPanel.vue'
import { useAppUpdate } from '@/composables/useAppUpdate'
import { setLocale, SUPPORTED_LOCALES } from '@/i18n'
import type { ThreadListItem } from '@morg/shared'

const { needRefresh, updateServiceWorker } = useAppUpdate()
const { t, locale } = useI18n()

function toggleLocale() {
  const current = locale.value
  const next = SUPPORTED_LOCALES[(SUPPORTED_LOCALES.indexOf(current as 'ja' | 'en') + 1) % SUPPORTED_LOCALES.length]
  setLocale(next)
}

const SidebarItem = defineComponent({
  props: { label: String, active: Boolean },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      class: [
        'w-full text-left px-2 py-1.5 text-sm rounded hover:bg-forest-100 cursor-pointer',
        props.active ? 'bg-forest-100 text-forest-800 font-medium' : 'text-gray-700',
      ],
      onClick: () => emit('click'),
    }, props.label)
  },
})

// ──────── 状態（URLクエリパラメータが source of truth） ────────
const auth        = useAuthStore()
const router      = useRouter()
const route       = useRoute()
const queryClient = useQueryClient()
const showMenu    = ref(false)

// URL: ?q=in:inbox&sender=foo@bar.com
const baseQuery    = computed(() => String(route.query.q   || 'in:inbox'))
const activeSender = computed(() => typeof route.query.sender === 'string' ? route.query.sender : null)

const searchInput = ref('')
const checkedIds = ref(new Set<string>())
type SpTab = 'list' | 'senders' | 'labels'
const spTab = ref<SpTab>('list')

const query = computed(() =>
  activeSender.value
    ? `from:${activeSender.value}`
    : baseQuery.value,
)

// ──────── データ取得 ────────
const { data, isFetching, isError, error, fetchNextPage, hasNextPage } = useThreads(query)
const { data: labels } = useLabels()

// ──────── 自動取得（送信者フィルタ or 検索条件あり の場合のみ） ────────
const isActiveSearch = computed(() =>
  activeSender.value !== null || baseQuery.value !== 'in:inbox',
)
const autoFetchStopped = ref(false)
// フェッチサイクルが実際に開始されて動いているか（「すべき状態か」とは別）
// ウォッチャーが fetchNextPage() を呼んだ時だけ true になる
// クエリ変更・ユーザー停止・画面遷移後の復帰ではリセットされるため
// インジケーターが「空振り」表示されることを防ぐ
const autoFetchActive = ref(false)

watch(query, () => {
  autoFetchStopped.value = false
  autoFetchActive.value = false
})

watch(
  [hasNextPage, isFetching, autoFetchStopped, isActiveSearch],
  ([hasNext, fetching, stopped, isSearch]) => {
    if (hasNext && !fetching && !stopped && isSearch) {
      autoFetchActive.value = true
      fetchNextPage()
    }
  },
)

function onStopFetch() {
  autoFetchStopped.value = true
  autoFetchActive.value = false
}
function onLoadMore() {
  autoFetchStopped.value = false
  // autoFetchActive は watch が fetchNextPage() を呼んだ時に true になる
}

const threads = computed<ThreadListItem[]>(() =>
  data.value?.pages.flatMap((p) => p.threads) ?? [],
)
const senders = useSenders(() => threads.value)

// ──────── URLを更新するヘルパー ────────
// デフォルト値はパラメータを省略してURLをクリーンに保つ
function replaceQuery(q: string, sender?: string | null) {
  const query: Record<string, string> = {}
  if (q && q !== 'in:inbox') query.q = q
  if (sender) query.sender = sender
  router.replace({ name: 'inbox', query })
}

// ──────── ナビゲーションハンドラ ────────
const navTabs = computed(() => [
  { label: t('nav.inbox'), q: 'in:inbox' },
  { label: t('nav.unread'), q: 'is:unread' },
  { label: t('nav.sent'), q: 'in:sent' },
])

function setBaseQuery(q: string) {
  searchInput.value = ''
  clearChecked()
  replaceQuery(q)
}

function onSearch() {
  const q = searchInput.value.trim() || 'in:inbox'
  clearChecked()
  spTab.value = 'list'
  replaceQuery(q)
}

function onSenderSelect(address: string | null) {
  clearChecked()
  if (address) {
    spTab.value = 'list'
    replaceQuery(baseQuery.value, address)
  } else {
    replaceQuery(baseQuery.value)
  }
}

function onLabelSelect(q: string) {
  clearChecked()
  spTab.value = 'list'
  replaceQuery(q)
}

function toggleCheck(id: string) {
  const next = new Set(checkedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  checkedIds.value = next
}
function selectAll(ids: string[]) { checkedIds.value = new Set(ids) }
function clearChecked() { checkedIds.value = new Set() }

function onSelect(thread: ThreadListItem) {
  router.push({ name: 'thread', params: { id: thread.threadId } })
}


function onReload() {
  autoFetchStopped.value = false
  queryClient.resetQueries({ queryKey: ['threads'], exact: false })
}

async function onLogout() {
  showMenu.value = false
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="h-dvh flex flex-col bg-white overflow-hidden">
    <!-- ヘッダー -->
    <header class="bg-forest-900 border-b border-forest-800 flex items-center gap-1.5 px-2 flex-shrink-0 safe-top h-[52px]">
      <button
        class="font-bold text-sm w-10 flex-shrink-0 text-forest-100 hover:text-white cursor-pointer text-left"
        :title="t('app.tagline')"
        @click="router.push({ name: 'login' })"
      >morg</button>

      <form class="flex-1 flex items-center min-w-0" @submit.prevent="onSearch">
        <div class="flex gap-1 w-full items-center">
          <input
            v-model="searchInput"
            type="search"
            :placeholder="t('search.placeholder')"
            class="flex-1 border border-forest-700 bg-forest-800 text-forest-100 placeholder-forest-400 rounded px-2 text-sm outline-none focus:ring-1 focus:ring-forest-400 min-w-0 h-9"
          />
          <button
            type="submit"
            :aria-label="t('actions.search')"
            class="w-9 h-9 bg-forest-600 text-white rounded hover:bg-forest-500 cursor-pointer flex-shrink-0 flex items-center justify-center"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </form>

      <!-- リロードボタン -->
      <button
        class="w-11 h-11 flex items-center justify-center text-forest-300 hover:text-forest-100 cursor-pointer flex-shrink-0 text-base"
        :class="isFetching ? 'animate-spin' : ''"
        :title="t('actions.reload')"
        @click="onReload"
      >↻</button>

      <!-- メニューボタン（ログアウトを格納） -->
      <div class="relative flex-shrink-0">
        <button
          class="w-11 h-11 flex items-center justify-center text-forest-300 hover:text-forest-100 cursor-pointer text-lg"
          @click="showMenu = !showMenu"
        >≡</button>
        <div
          v-if="showMenu"
          class="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg z-50 min-w-[120px]"
        >
          <button
            class="w-full text-left px-4 min-h-[44px] flex items-center text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            @click="showMenu = false; router.push({ name: 'plugins' })"
          >{{ t('nav.plugins') }}</button>
          <button
            class="w-full text-left px-4 min-h-[44px] flex items-center text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            @click="showMenu = false; router.push({ name: 'info' })"
          >{{ t('nav.info') }}</button>
          <button
            class="w-full text-left px-4 min-h-[44px] flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            @click="toggleLocale(); showMenu = false"
          >
            <span>{{ t('actions.language') }}</span>
            <span class="text-xs font-mono text-gray-400 ml-2">{{ locale.toUpperCase() }}</span>
          </button>
          <div class="border-t" />
          <button
            class="w-full text-left px-4 min-h-[44px] flex items-center text-sm text-red-500 hover:bg-gray-50 cursor-pointer"
            @click="onLogout"
          >{{ t('nav.logout') }}</button>
        </div>
      </div>
      <!-- メニュー外クリックで閉じる -->
      <div v-if="showMenu" class="fixed inset-0 z-40" @click="showMenu = false" />
    </header>

    <!-- アップデートバナー -->
    <div
      v-if="needRefresh"
      class="bg-forest-700 text-forest-100 text-sm px-3 py-2 flex items-center gap-2 flex-shrink-0"
    >
      <span class="flex-1">{{ t('status.updateAvailable') }}</span>
      <button
        class="px-3 min-h-[36px] flex items-center bg-forest-500 hover:bg-forest-400 rounded text-xs font-medium cursor-pointer"
        @click="updateServiceWorker()"
      >{{ t('actions.updateNow') }}</button>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- PC サイドバー（フォルダ＋ラベル） -->
      <aside class="hidden md:flex flex-col w-36 border-r flex-shrink-0 overflow-y-auto px-1 py-1 gap-0.5">
        <SidebarItem
          v-for="t in navTabs" :key="t.q"
          :label="t.label"
          :active="baseQuery === t.q && !activeSender"
          @click="setBaseQuery(t.q)"
        />

        <template v-if="labels?.length">
          <div class="mt-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">{{ t('nav.labels') }}</div>
          <SidebarItem
            v-for="l in labels" :key="l.id"
            :label="l.name"
            :active="baseQuery === l.query && !activeSender"
            @click="onLabelSelect(l.query)"
          />
        </template>
      </aside>

      <!-- PC 送信者パネル -->
      <div class="hidden md:flex flex-col w-52 border-r flex-shrink-0 overflow-hidden">
        <SenderPanel :senders="senders" :active-sender="activeSender" @select="onSenderSelect" />
      </div>

      <!-- スレッドリスト本体 -->
      <main class="flex-1 overflow-hidden flex flex-col">
        <!-- SP タブ（min-h-[44px] で Apple HIG 準拠） -->
        <div class="flex md:hidden border-b">
          <button
            v-for="tab in navTabs" :key="tab.q"
            class="flex-1 min-h-[44px] flex items-center justify-center text-sm font-medium cursor-pointer"
            :class="baseQuery === tab.q && spTab === 'list' && !activeSender ? 'text-forest-600 border-b-2 border-forest-600' : 'text-gray-500'"
            @click="setBaseQuery(tab.q); spTab = 'list'"
          >{{ tab.label }}</button>
          <button
            class="flex-1 min-h-[44px] flex items-center justify-center text-sm font-medium cursor-pointer"
            :class="spTab === 'senders' ? 'text-forest-600 border-b-2 border-forest-600' : 'text-gray-500'"
            @click="spTab = 'senders'"
          >{{ t('nav.senders') }}</button>
          <button
            class="flex-1 min-h-[44px] flex items-center justify-center text-sm font-medium cursor-pointer"
            :class="spTab === 'labels' ? 'text-forest-600 border-b-2 border-forest-600' : 'text-gray-500'"
            @click="spTab = 'labels'"
          >{{ t('nav.labels') }}</button>
        </div>

        <!-- SP 送信者パネル -->
        <div v-if="spTab === 'senders'" class="flex-1 min-h-0 overflow-hidden md:hidden">
          <SenderPanel :senders="senders" :active-sender="activeSender" @select="onSenderSelect" />
        </div>

        <!-- SP ラベルパネル -->
        <div v-else-if="spTab === 'labels'" class="flex-1 min-h-0 overflow-y-auto md:hidden">
          <div
            v-for="l in labels" :key="l.id"
            class="flex items-center px-3 min-h-[44px] border-b cursor-pointer hover:bg-gray-50"
            :class="baseQuery === l.query && !activeSender ? 'bg-forest-50' : ''"
            @click="onLabelSelect(l.query)"
          >
            <span class="text-sm" :class="l.type === 'user' ? 'text-gray-700' : 'text-gray-600'">
              {{ l.name }}
            </span>
            <span v-if="l.type === 'user'" class="ml-auto text-xs text-gray-400">●</span>
          </div>
        </div>

        <!-- アクティブフィルタ表示 -->
        <div v-if="activeSender" class="flex items-center gap-2 px-3 min-h-[44px] bg-forest-50 border-b text-sm flex-shrink-0">
          <span class="text-forest-700 truncate">{{ t('sender.filter', { address: activeSender }) }}</span>
          <button
            class="ml-auto flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:bg-forest-100 hover:text-gray-700 cursor-pointer text-base"
            @click="onSenderSelect(null)"
          >✕</button>
        </div>

        <template v-if="spTab === 'list' || activeSender">
          <BulkActionBar :selected-ids="[...checkedIds]" :labels="labels ?? []" @clear="clearChecked" />
          <ThreadList
            class="flex-1 min-h-0"
            :threads="threads"
            :is-fetching="isFetching"
            :is-error="isError"
            :error="(error as Error | null)"
            :has-next-page="!!hasNextPage"
            :checked-ids="checkedIds"
            :auto-fetch-enabled="isActiveSearch"
            :auto-fetch-active="autoFetchActive"
            :auto-fetch-stopped="autoFetchStopped"
            @select="onSelect"
            @check="toggleCheck"
            @select-all="selectAll"
            @clear-all="clearChecked"
            @load-more="onLoadMore"
            @stop-fetch="onStopFetch"
          />
        </template>
      </main>
    </div>
  </div>
</template>
