<script setup lang="ts">
import { ref, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ThreadList from '@/components/ThreadList.vue'
import BulkActionBar from '@/components/BulkActionBar.vue'
import type { ThreadListItem } from '@morg/shared'

const SidebarItem = defineComponent({
  props: { label: String, active: Boolean },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      class: [
        'w-full text-left px-4 py-2 text-sm rounded-lg mx-1 hover:bg-gray-100 cursor-pointer',
        props.active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700',
      ],
      onClick: () => emit('click'),
    }, props.label)
  },
})

const auth = useAuthStore()
const router = useRouter()
const query = ref('in:inbox')
const searchInput = ref('')
const checkedIds = ref(new Set<string>())

const tabs = [
  { label: '受信', q: 'in:inbox' },
  { label: '未読', q: 'is:unread' },
  { label: '送信済み', q: 'in:sent' },
]

function setQuery(q: string) {
  query.value = q
  searchInput.value = ''
  clearChecked()
}

function toggleCheck(id: string) {
  const next = new Set(checkedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  checkedIds.value = next
}

function clearChecked() {
  checkedIds.value = new Set()
}

function onSearch() {
  const trimmed = searchInput.value.trim()
  query.value = trimmed || 'in:inbox'
}

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

      <!-- 検索バー -->
      <form class="flex-1" @submit.prevent="onSearch">
        <div class="flex gap-1.5">
          <input
            v-model="searchInput"
            type="search"
            placeholder="検索..."
            class="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 min-w-0"
          />
          <button
            type="submit"
            class="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 cursor-pointer flex-shrink-0"
          >
            検索
          </button>
        </div>
      </form>

      <button class="text-xs text-gray-400 hover:text-gray-700 cursor-pointer flex-shrink-0" @click="onLogout">
        ログアウト
      </button>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- サイドバー（PC: 常時表示 / SP: 非表示） -->
      <aside class="hidden md:flex flex-col w-44 border-r flex-shrink-0 py-3 gap-0.5">
        <SidebarItem label="受信トレイ" :active="query === 'in:inbox'" @click="setQuery('in:inbox')" />
        <SidebarItem label="未読" :active="query === 'is:unread'" @click="setQuery('is:unread')" />
        <SidebarItem label="送信済み" :active="query === 'in:sent'" @click="setQuery('in:sent')" />
      </aside>

      <!-- スレッドリスト -->
      <main class="flex-1 overflow-hidden flex flex-col">
        <!-- SP用ナビゲーションタブ -->
        <div class="flex md:hidden border-b text-sm">
          <button
            v-for="tab in tabs"
            :key="tab.q"
            class="flex-1 py-2 font-medium cursor-pointer"
            :class="query === tab.q ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'"
            @click="setQuery(tab.q)"
          >{{ tab.label }}</button>
        </div>

        <BulkActionBar :selected-ids="[...checkedIds]" @clear="clearChecked" />
        <ThreadList
          :query="query"
          :checked-ids="checkedIds"
          @select="onSelect"
          @check="toggleCheck"
        />
      </main>
    </div>
  </div>
</template>
