<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { registeredPlugins } from '@/plugins'
import { usePluginsStore } from '@/stores/plugins'

const router = useRouter()
const store  = usePluginsStore()
const { t } = useI18n()
</script>

<template>
  <div class="h-dvh flex flex-col bg-white overflow-hidden">
    <!-- ヘッダー -->
    <header class="bg-forest-900 border-b border-forest-800 flex items-center gap-2 safe-left pr-2 flex-shrink-0 safe-top min-h-[52px] app-titlebar">
      <button
        class="w-11 h-11 flex items-center justify-center text-forest-300 hover:text-forest-100 cursor-pointer text-xl"
        @click="router.back()"
      >←</button>
      <span class="font-bold text-sm text-forest-100">{{ t('plugins.title') }}</span>
    </header>

    <main class="flex-1 overflow-y-auto">
      <p class="text-xs text-gray-400 px-4 pt-4 pb-2">
        {{ t('plugins.hint') }}
      </p>

      <div class="flex flex-col gap-3 px-4 pb-6">
        <div
          v-for="plugin in registeredPlugins"
          :key="plugin.id"
          class="border rounded-xl overflow-hidden"
          :class="store.enabled[plugin.id] ? 'border-forest-200 bg-forest-50/30' : 'border-gray-200'"
        >
          <!-- プラグインヘッダー行 -->
          <div class="flex items-center gap-3 px-4 py-3">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ plugin.name }}</p>
              <p v-if="plugin.description" class="text-xs text-gray-500 mt-0.5">{{ plugin.description }}</p>
            </div>
            <!-- トグルスイッチ -->
            <button
              role="switch"
              :aria-checked="store.enabled[plugin.id]"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none"
              :class="store.enabled[plugin.id] ? 'bg-forest-600' : 'bg-gray-300'"
              @click="store.setEnabled(plugin.id, !store.enabled[plugin.id])"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                :class="store.enabled[plugin.id] ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <!-- 設定フィールド（有効かつ configSchema がある場合のみ） -->
          <div
            v-if="store.enabled[plugin.id] && plugin.configSchema"
            class="border-t border-forest-100 px-4 py-3 flex flex-col gap-3 bg-white"
          >
            <div
              v-for="(field, key) in plugin.configSchema"
              :key="key"
              class="flex flex-col gap-1"
            >
              <label class="text-xs font-medium text-gray-600">
                {{ field.label }}
                <span v-if="field.required" class="text-red-400 ml-0.5" :aria-label="t('plugins.required')">*</span>
              </label>
              <input
                :type="field.type === 'password' ? 'password' : 'text'"
                :placeholder="field.placeholder ?? ''"
                :value="store.getConfig(plugin.id)[key] ?? ''"
                class="border rounded px-3 h-9 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-forest-400"
                @input="store.setConfig(plugin.id, key, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>

        <!-- プラグインがまだない場合 -->
        <p v-if="registeredPlugins.length === 0" class="text-center text-sm text-gray-400 py-8">
          {{ t('plugins.empty') }}
        </p>
      </div>
    </main>
  </div>
</template>
