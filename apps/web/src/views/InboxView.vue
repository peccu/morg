<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ThreadList from '@/components/ThreadList.vue'
import BulkActionBar from '@/components/BulkActionBar.vue'
import type { ThreadListItem } from '@morg/shared'

const auth = useAuthStore()
const router = useRouter()
const query = ref('in:inbox')
const searchInput = ref('')
const checkedIds = ref(new Set<string>())

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
  <div class="min-h-screen flex flex-col bg-white">
    <!-- ヘッダー -->
    <header class="h-14 border-b flex items-center gap-4 px-4 flex-shrink-0">
      <span class="font-bold text-lg w-40">morg</span>

      <!-- 検索バー -->
      <form class="flex-1 max-w-2xl" @submit.prevent="onSearch">
        <div class="flex gap-2">
          <input
            v-model="searchInput"
            type="text"
            placeholder="検索（例: from:someone@gmail.com）"
            class="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            class="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 cursor-pointer"
          >
            検索
          </button>
        </div>
      </form>

      <div class="flex items-center gap-3 ml-auto">
        <span class="text-xs text-gray-500">{{ auth.userEmail }}</span>
        <button class="text-sm text-gray-500 hover:text-gray-800 cursor-pointer" @click="onLogout">
          ログアウト
        </button>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- サイドバー -->
      <aside class="w-44 border-r flex-shrink-0 py-3">
        <button
          class="w-full text-left px-4 py-2 text-sm rounded-lg mx-1 hover:bg-gray-100 cursor-pointer"
          :class="query === 'in:inbox' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'"
          @click="query = 'in:inbox'; searchInput = ''"
        >
          受信トレイ
        </button>
        <button
          class="w-full text-left px-4 py-2 text-sm rounded-lg mx-1 hover:bg-gray-100 cursor-pointer"
          :class="query === 'is:unread' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'"
          @click="query = 'is:unread'; searchInput = ''"
        >
          未読
        </button>
        <button
          class="w-full text-left px-4 py-2 text-sm rounded-lg mx-1 hover:bg-gray-100 cursor-pointer"
          :class="query === 'in:sent' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'"
          @click="query = 'in:sent'; searchInput = ''"
        >
          送信済み
        </button>
      </aside>

      <!-- スレッドリスト -->
      <main class="flex-1 overflow-hidden flex flex-col">
        <BulkActionBar
          :selected-ids="[...checkedIds]"
          @clear="clearChecked"
        />
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
