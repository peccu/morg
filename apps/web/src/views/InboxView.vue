<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="h-14 border-b flex items-center justify-between px-4 bg-white">
      <span class="font-semibold text-lg">morg</span>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500">{{ auth.userEmail }}</span>
        <button
          class="text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          @click="auth.logout()"
        >
          ログアウト
        </button>
      </div>
    </header>
    <main class="flex flex-1">
      <aside class="w-56 border-r p-4 bg-white">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Labels</p>
        <p class="text-sm text-gray-400 italic">（実装予定）</p>
      </aside>
      <section class="flex-1 p-6">
        <p class="text-gray-400 text-sm">スレッド一覧（実装予定）</p>
      </section>
    </main>
  </div>
</template>
