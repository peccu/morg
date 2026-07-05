<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppUpdate } from '@/composables/useAppUpdate'

const router = useRouter()
const { needRefresh, updateServiceWorker } = useAppUpdate()
const { t, locale } = useI18n()

const buildDate = computed(() => {
  const d = new Date(__BUILD_DATE__)
  const loc = locale.value === 'en' ? 'en-US' : 'ja-JP'
  return d.toLocaleString(loc, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const checking = ref(false)
const checked = ref(false)

async function checkUpdate() {
  checking.value = true
  checked.value = false
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg) {
      await reg.update()
      // installing 中のSWがあれば installed 状態になるまで待つ（最大5秒）
      // 固定 1秒ではインストール完了前に判定してしまい needRefresh が false のまま誤表示される
      if (reg.installing) {
        await new Promise<void>(resolve => {
          const sw = reg.installing!
          const done = () => {
            sw.removeEventListener('statechange', onStateChange)
            resolve()
          }
          const onStateChange = () => {
            if (sw.state === 'installed' || sw.state === 'activating' || sw.state === 'activated') done()
          }
          sw.addEventListener('statechange', onStateChange)
          setTimeout(done, 5000)
        })
      }
      // needRefresh への伝播を待つ短い余裕
      await new Promise<void>(resolve => setTimeout(resolve, 100))
    }
  } catch {
    // ServiceWorker 未対応環境では無視
  } finally {
    checking.value = false
    if (!needRefresh.value) checked.value = true
  }
}
</script>

<template>
  <div class="h-dvh flex flex-col bg-white overflow-hidden">
    <!-- ヘッダー -->
    <header class="bg-forest-900 border-b border-forest-800 flex items-center gap-2 safe-left pr-2 flex-shrink-0 safe-top min-h-[52px] app-titlebar">
      <button
        class="w-11 h-11 flex items-center justify-center text-forest-300 hover:text-forest-100 cursor-pointer text-xl"
        @click="router.back()"
      >←</button>
      <span class="font-bold text-sm text-forest-100">{{ t('info.title') }}</span>
    </header>

    <main class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <!-- アプリ名 -->
      <section class="text-center pt-4">
        <p class="text-3xl font-bold text-forest-800">morg</p>
        <p class="text-sm text-gray-500 mt-1">Mail Organizer</p>
      </section>

      <!-- ビルド日時 -->
      <section class="bg-gray-50 rounded-lg px-4 py-3">
        <p class="text-xs text-gray-400 mb-1">{{ t('info.buildDate') }}</p>
        <p class="text-sm text-gray-800 font-mono">{{ buildDate }}</p>
      </section>

      <!-- アップデート -->
      <section class="bg-gray-50 rounded-lg px-4 py-3 flex flex-col gap-3">
        <p class="text-xs text-gray-400">{{ t('info.update') }}</p>

        <div v-if="needRefresh" class="flex items-center gap-3">
          <span class="text-sm text-forest-700 flex-1">{{ t('status.updateAvailable') }}</span>
          <button
            class="px-4 min-h-[44px] flex items-center bg-forest-600 hover:bg-forest-500 text-white rounded text-sm font-medium cursor-pointer"
            @click="updateServiceWorker()"
          >{{ t('actions.updateNow') }}</button>
        </div>

        <div v-else-if="checked" class="text-sm text-gray-600">
          {{ t('status.latestVersion') }}
        </div>

        <button
          v-if="!needRefresh"
          class="self-start px-4 min-h-[44px] flex items-center border rounded text-sm text-gray-600 hover:bg-gray-100 cursor-pointer disabled:opacity-50"
          :disabled="checking"
          @click="checkUpdate"
        >
          <svg v-if="checking" class="w-4 h-4 mr-2 animate-spin text-forest-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {{ checking ? t('actions.checking') : t('actions.checkUpdate') }}
        </button>
      </section>

      <!-- リンク -->
      <section class="flex flex-col gap-1">
        <a
          href="https://github.com/peccu/morg"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between px-4 min-h-[44px] rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700"
        >
          <span>GitHub</span>
          <span class="text-gray-400 text-xs">github.com/peccu/morg ↗</span>
        </a>
        <a
          href="https://github.com/peccu/morg/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between px-4 min-h-[44px] rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700"
        >
          <span>{{ t('info.license') }}</span>
          <span class="text-gray-400 text-xs">↗</span>
        </a>
      </section>
    </main>
  </div>
</template>
