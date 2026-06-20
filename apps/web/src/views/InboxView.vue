<script setup lang="ts">
import { ref, computed, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThreads } from '@/composables/useThreads'
import { useSenders } from '@/composables/useSenders'
import ThreadList from '@/components/ThreadList.vue'
import BulkActionBar from '@/components/BulkActionBar.vue'
import SenderPanel from '@/components/SenderPanel.vue'
import type { ThreadListItem } from '@morg/shared'

// ──────── インラインコンポーネント ────────
const SidebarItem = defineComponent({
  props: { label: String, active: Boolean },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      class: [
        'w-full text-left px-4 py-2 text-sm rounded-lg hover:bg-gray-100 cursor-pointer',
        props.active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700',
      ],
      onClick: () => emit('click'),
    }, props.label)
  },
})

// ──────── 状態 ────────
const auth   = useAuthStore()
const router = useRouter()

const baseQuery    = ref('in:inbox')    // 受信/未読/送信済み/検索
const activeSender = ref<string | null>(null)
const searchInput  = ref('')
const checkedIds   = ref(new Set<string>())
type SpTab = 'list' | 'senders'
const spTab        = ref<SpTab>('list')

// sender選択時は from: クエリを合成
const query = computed(() =>
  activeSender.value ? `from:${activeSender.value} ${baseQuery.value}`.trim() : baseQuery.value,
)

// ──────── データ取得 ────────
const { data, isFetching, isError, error, fetchNextPage, hasNextPage } = useThreads(query)

const threads = computed<ThreadListItem[]>(() =>
  data.value?.pages.flatMap((p) => p.threads) ?? [],
)

const senders = useSenders(() => threads.value)

// ──────── ハンドラ ────────
const navTabs = [
  { label: '受信', q: 'in:inbox' },
  { label: '未読', q: 'is:unread' },
  { label: '送信済み', q: 'in:sent' },
]

function setBaseQuery(q: string) {
  baseQuery.value = q
  searchInput.value = ''
  clearChecked()
}

function onSearch() {
  baseQuery.value = searchInput.value.trim() || 'in:inbox'
  activeSender.value = null
  clearChecked()
  spTab.value = 'list'
}

function onSenderSelect(address: string | null) {
  activeSender.value = address
  clearChecked()
  if (address) spTab.value = 'list'
}

function toggleCheck(id: string) {
  const next = new Set(checkedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  checkedIds.value = next
}
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
  <div class="h-screen flex flex-col bg-white overflow-hidden">
    <!-- ヘッダー -->
    <header class="border-b flex items-center gap-2 px-3 py-2 flex-shrink-0 safe-top">
      <span class="font-bold text-base w-12 flex-shrink-0">morg</span>

      <form class="flex-1" @submit.prevent="onSearch">
        <div class="flex gap-1.5">
          <input
            v-model="searchInput"
            type="search"
            placeholder="検索..."
            class="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 min-w-0"
          />
          <button type="submit" class="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 cursor-pointer flex-shrink-0">
            検索
          </button>
        </div>
      </form>

      <button class="text-xs text-gray-400 hover:text-gray-700 cursor-pointer flex-shrink-0" @click="onLogout">
        ログアウト
      </button>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- PC サイドバー（フォルダ） -->
      <aside class="hidden md:flex flex-col w-40 border-r flex-shrink-0 pt-3 gap-0.5 px-2">
        <SidebarItem
          v-for="t in navTabs" :key="t.q"
          :label="t.label"
          :active="baseQuery === t.q && !activeSender"
          @click="setBaseQuery(t.q); activeSender = null"
        />
      </aside>

      <!-- PC 送信者パネル -->
      <div class="hidden md:flex flex-col w-56 border-r flex-shrink-0 overflow-hidden">
        <SenderPanel
          :senders="senders"
          :active-sender="activeSender"
          @select="onSenderSelect"
        />
      </div>

      <!-- スレッドリスト本体 -->
      <main class="flex-1 overflow-hidden flex flex-col">
        <!-- SP タブ -->
        <div class="flex md:hidden border-b text-sm">
          <button
            v-for="t in navTabs" :key="t.q"
            class="flex-1 py-2 font-medium cursor-pointer truncate px-1"
            :class="baseQuery === t.q && spTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'"
            @click="setBaseQuery(t.q); spTab = 'list'"
          >{{ t.label }}</button>
          <button
            class="flex-1 py-2 font-medium cursor-pointer"
            :class="spTab === 'senders' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'"
            @click="spTab = 'senders'"
          >送信者</button>
        </div>

        <!-- SP 送信者パネル -->
        <div v-if="spTab === 'senders'" class="flex-1 overflow-hidden md:hidden">
          <SenderPanel
            :senders="senders"
            :active-sender="activeSender"
            @select="onSenderSelect"
          />
        </div>

        <!-- 選択中フィルタ表示 -->
        <div v-if="activeSender" class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-b text-xs flex-shrink-0">
          <span class="text-blue-700">送信者: {{ activeSender }}</span>
          <button class="ml-auto text-gray-400 hover:text-gray-600 cursor-pointer" @click="activeSender = null">✕</button>
        </div>

        <template v-if="spTab === 'list' || activeSender">
          <BulkActionBar :selected-ids="[...checkedIds]" @clear="clearChecked" />
          <ThreadList
            :threads="threads"
            :is-fetching="isFetching"
            :is-error="isError"
            :error="(error as Error | null)"
            :has-next-page="!!hasNextPage"
            :checked-ids="checkedIds"
            @select="onSelect"
            @check="toggleCheck"
            @load-more="fetchNextPage()"
          />
        </template>
      </main>
    </div>
  </div>
</template>
