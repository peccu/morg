<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()

// PWAホーム画面から開いている場合は navigator.standalone が true
const isPWA = (navigator as { standalone?: boolean }).standalone === true
  || window.matchMedia('(display-mode: standalone)').matches

onMounted(async () => {
  await auth.checkAuth()
  // PWAでなければそのまま受信トレイへ
  if (!isPWA) {
    router.replace({ name: 'inbox' })
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-forest-50 p-6">
    <div class="max-w-sm w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-5">
      <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h1 class="text-xl font-bold text-gray-900">{{ t('login.success') }}</h1>
        <p v-if="isPWA" class="mt-2 text-sm text-gray-500 leading-relaxed">
          {{ t('login.pwaInstruction', { app: 'morg' }) }}
        </p>
        <p v-else class="mt-2 text-sm text-gray-500">
          {{ t('login.redirecting') }}
        </p>
      </div>

      <a
        href="/inbox"
        class="block w-full py-2.5 bg-forest-600 text-white rounded-lg text-sm font-medium hover:bg-forest-500"
      >
        {{ t('login.openInbox') }}
      </a>
    </div>
  </div>
</template>
