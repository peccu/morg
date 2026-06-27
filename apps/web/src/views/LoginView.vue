<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { t } = useI18n()

const GITHUB_URL = 'https://github.com/peccu/morg'
</script>

<template>
  <div class="min-h-dvh bg-forest-50 flex flex-col">

    <!-- ヒーロー -->
    <main class="flex-1 flex flex-col items-center px-4 pt-12 pb-8">
      <div class="w-full max-w-sm space-y-8">

        <!-- アプリ名 + キャッチコピー -->
        <div class="text-center space-y-2">
          <h1 class="text-5xl font-bold text-forest-900 tracking-tight">morg</h1>
          <p class="text-forest-700 font-medium text-base">{{ t('landing.tagline') }}</p>
          <p class="text-gray-500 text-sm leading-relaxed">{{ t('landing.desc') }}</p>
        </div>

        <!-- ログインカード -->
        <div class="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <!-- ログイン中スピナー -->
          <div v-if="auth.isLoggingIn" class="flex flex-col items-center gap-3 py-4">
            <svg class="w-8 h-8 animate-spin text-forest-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p class="text-sm text-gray-500">{{ t('status.connectingGoogle') }}</p>
          </div>

          <!-- ログインボタン -->
          <button
            v-else
            class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            :disabled="auth.isLoggingIn"
            @click="auth.login()"
          >
            <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {{ t('login.withGoogle') }}
          </button>

          <!-- エラーメッセージ -->
          <div v-if="auth.loginError" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p class="text-sm text-red-700 font-medium">{{ t('login.failed') }}</p>
            <p class="text-xs text-red-500 mt-1 break-all">{{ auth.loginError }}</p>
            <button
              class="mt-2 text-xs text-red-600 underline cursor-pointer"
              @click="auth.loginError = null"
            >{{ t('actions.close') }}</button>
          </div>
        </div>

        <!-- 機能紹介 -->
        <div class="space-y-3">
          <p class="text-xs font-semibold text-forest-700 uppercase tracking-widest text-center">{{ t('landing.featuresTitle') }}</p>
          <div class="grid grid-cols-2 gap-3">

            <!-- 一括操作 -->
            <div class="bg-white rounded-xl p-4 shadow-sm space-y-1.5">
              <div class="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-700">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-gray-800">{{ t('landing.bulk') }}</h3>
              <p class="text-xs text-gray-500 leading-relaxed">{{ t('landing.bulkDesc') }}</p>
            </div>

            <!-- モバイルPWA -->
            <div class="bg-white rounded-xl p-4 shadow-sm space-y-1.5">
              <div class="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-700">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-gray-800">{{ t('landing.pwa') }}</h3>
              <p class="text-xs text-gray-500 leading-relaxed">{{ t('landing.pwaDesc') }}</p>
            </div>

            <!-- プラグイン -->
            <div class="bg-white rounded-xl p-4 shadow-sm space-y-1.5">
              <div class="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-700">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-gray-800">{{ t('landing.plugin') }}</h3>
              <p class="text-xs text-gray-500 leading-relaxed">{{ t('landing.pluginDesc') }}</p>
            </div>

            <!-- OSS -->
            <div class="bg-white rounded-xl p-4 shadow-sm space-y-1.5">
              <div class="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-700">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-gray-800">{{ t('landing.oss') }}</h3>
              <p class="text-xs text-gray-500 leading-relaxed">{{ t('landing.ossDesc') }}</p>
            </div>

          </div>
        </div>

      </div>
    </main>

    <!-- フッター -->
    <footer class="py-6 text-center border-t border-forest-100">
      <a
        :href="GITHUB_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 text-sm text-forest-600 hover:text-forest-800 transition-colors"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        {{ t('landing.github') }}
      </a>
    </footer>

  </div>
</template>
