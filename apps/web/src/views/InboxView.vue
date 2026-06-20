<script setup lang="ts">
import { ref, computed, watch, defineComponent, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThreads } from '@/composables/useThreads'
import { useSenders } from '@/composables/useSenders'
import { useLabels } from '@/composables/useLabels'
import ThreadList from '@/components/ThreadList.vue'
import BulkActionBar from '@/components/BulkActionBar.vue'
import SenderPanel from '@/components/SenderPanel.vue'
import type { ThreadListItem } from '@morg/shared'

const SidebarItem = defineComponent({
  props: { label: String, active: Boolean },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      class: [
        'w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 cursor-pointer',
        props.active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700',
      ],
      onClick: () => emit('click'),
    }, props.label)
  },
})

// ──────── 状態（URLクエリパラメータが source of truth） ────────
const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()

// URL: ?q=in:inbox&sender=foo@bar.com
const baseQuery    = computed(() => String(route.query.q   || 'in:inbox'))
const activeSender = computed(() => typeof route.query.sender === 'string' ? route.query.sender : null)

const searchInput = ref('')
const checkedIds  = ref(new Set<string>())
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

// ──────── 自動取得 ────────
const autoFetchStopped = ref(false)

// クエリが変わったら自動取得を再開
watch(query, () => { autoFetchStopped.value = false })

// 次ページがあり、取得中でなく、停止していなければ自動で次ページを取得
watch(
  [hasNextPage, isFetching, autoFetchStopped],
  ([hasNext, fetching, stopped]) => {
    if (hasNext && !fetching && !stopped) fetchNextPage()
  },
)

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
const navTabs = [
  { label: '受信', q: 'in:inbox' },
  { label: '未読', q: 'is:unread' },
  { label: '送信', q: 'in:sent' },
]

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

async function onLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="h-dvh flex flex-col bg-white overflow-hidden">
    <!-- ヘッダー -->
    <header class="border-b flex items-center gap-1.5 px-2 flex-shrink-0 safe-top min-h-[44px]">
      <span class="font-bold text-sm w-10 flex-shrink-0">morg</span>

      <form class="flex-1" @submit.prevent="onSearch">
        <div class="flex gap-1">
          <input
            v-model="searchInput"
            type="search"
            placeholder="検索..."
            class="flex-1 border rounded px-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 min-w-0 min-h-[44px]"
          />
          <button
            type="submit"
            class="px-3 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 cursor-pointer flex-shrink-0 min-h-[44px]"
          >検索</button>
        </div>
      </form>

      <button
        class="text-xs text-gray-400 hover:text-gray-700 cursor-pointer flex-shrink-0 px-2 min-h-[44px] flex items-center"
        @click="onLogout"
      >ログアウト</button>
    </header>

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
          <div class="mt-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">ラベル</div>
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
            v-for="t in navTabs" :key="t.q"
            class="flex-1 min-h-[44px] flex items-center justify-center text-sm font-medium cursor-pointer"
            :class="baseQuery === t.q && spTab === 'list' && !activeSender ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'"
            @click="setBaseQuery(t.q); spTab = 'list'"
          >{{ t.label }}</button>
          <button
            class="flex-1 min-h-[44px] flex items-center justify-center text-sm font-medium cursor-pointer"
            :class="spTab === 'senders' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'"
            @click="spTab = 'senders'"
          >送信者</button>
          <button
            class="flex-1 min-h-[44px] flex items-center justify-center text-sm font-medium cursor-pointer"
            :class="spTab === 'labels' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'"
            @click="spTab = 'labels'"
          >ラベル</button>
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
            :class="baseQuery === l.query && !activeSender ? 'bg-blue-50' : ''"
            @click="onLabelSelect(l.query)"
          >
            <span class="text-sm" :class="l.type === 'user' ? 'text-gray-700' : 'text-gray-600'">
              {{ l.name }}
            </span>
            <span v-if="l.type === 'user'" class="ml-auto text-xs text-gray-400">●</span>
          </div>
        </div>

        <!-- アクティブフィルタ表示 -->
        <div v-if="activeSender" class="flex items-center gap-2 px-3 min-h-[44px] bg-blue-50 border-b text-sm flex-shrink-0">
          <span class="text-blue-700 truncate">送信者: {{ activeSender }}</span>
          <button
            class="ml-auto flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:bg-blue-100 hover:text-gray-700 cursor-pointer text-base"
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
            :auto-fetch-stopped="autoFetchStopped"
            @select="onSelect"
            @check="toggleCheck"
            @select-all="selectAll"
            @clear-all="clearChecked"
            @load-more="autoFetchStopped = false"
            @stop-fetch="autoFetchStopped = true"
          />
        </template>
      </main>
    </div>
  </div>
</template>
