<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDemoStore } from '@/stores/demo'

const router = useRouter()
const { t } = useI18n()
const demo = useDemoStore()

function exitDemo() {
  demo.exit()
  router.push({ name: 'login' })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="demo.isDemo"
      class="fixed bottom-0 inset-x-0 z-[300] flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500 text-white text-sm safe-bottom"
    >
      <span class="font-medium">{{ t('demo.banner') }}</span>
      <button
        class="flex-shrink-0 px-3 py-1 rounded border border-white/60 hover:bg-amber-400 cursor-pointer text-xs font-medium transition-colors"
        @click="exitDemo"
      >{{ t('demo.exit') }}</button>
    </div>
  </Teleport>
</template>
