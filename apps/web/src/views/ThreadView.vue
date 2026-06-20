<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThread } from '@/composables/useThread'
import { extractBody } from '@/lib/mail-body'
import type { GmailMessagePart, GmailMessageHeader } from '@morg/shared'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)
const { data: thread, isPending, isError } = useThread(id)

function header(headers: GmailMessageHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}
</script>

<template>
  <div class="h-screen flex flex-col bg-white overflow-hidden">
    <header class="border-b flex items-center gap-3 px-4 py-3 flex-shrink-0 safe-top">
      <button
        class="text-sm text-gray-500 hover:text-gray-800 cursor-pointer flex items-center gap-1"
        @click="router.back()"
      >
        ← 戻る
      </button>
    </header>

    <main class="flex-1 overflow-y-auto">
      <div v-if="isPending" class="p-8 text-center text-gray-400">読み込み中...</div>
      <div v-else-if="isError" class="p-8 text-center text-red-400">取得に失敗しました</div>

      <div v-else-if="thread" class="max-w-4xl mx-auto px-6 py-6">
        <!-- スレッドタイトル -->
        <h1 class="text-xl font-semibold text-gray-900 mb-6">
          {{ header(thread.messages[0]?.payload?.headers ?? [], 'Subject') || '(件名なし)' }}
        </h1>

        <!-- メッセージ一覧 -->
        <div class="space-y-6">
          <article
            v-for="msg in thread.messages"
            :key="msg.id"
            class="border rounded-lg overflow-hidden"
          >
            <!-- メッセージヘッダー -->
            <div class="bg-gray-50 px-4 py-3 border-b">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-gray-900">
                    {{ header(msg.payload?.headers ?? [], 'From') }}
                  </p>
                  <p class="text-xs text-gray-500 mt-0.5">
                    To: {{ header(msg.payload?.headers ?? [], 'To') }}
                  </p>
                </div>
                <time class="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                  {{ header(msg.payload?.headers ?? [], 'Date') }}
                </time>
              </div>
            </div>

            <!-- メッセージ本文 -->
            <div class="px-4 py-4 overflow-x-auto">
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
