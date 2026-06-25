import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { registeredPlugins } from '@/plugins'

function loadEnabled(id: string, defaultEnabled: boolean): boolean {
  const stored = localStorage.getItem(`plugin:${id}:enabled`)
  return stored !== null ? (JSON.parse(stored) as boolean) : defaultEnabled
}

function loadConfig(id: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(`plugin:${id}:config`) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export const usePluginsStore = defineStore('plugins', () => {
  const enabled = ref<Record<string, boolean>>(
    Object.fromEntries(
      registeredPlugins.map((p) => [p.id, loadEnabled(p.id, p.defaultEnabled ?? false)]),
    ),
  )
  const configs = ref<Record<string, Record<string, string>>>(
    Object.fromEntries(registeredPlugins.map((p) => [p.id, loadConfig(p.id)])),
  )

  function setEnabled(id: string, val: boolean) {
    enabled.value = { ...enabled.value, [id]: val }
    localStorage.setItem(`plugin:${id}:enabled`, JSON.stringify(val))
  }

  function setConfig(id: string, key: string, val: string) {
    const next = { ...(configs.value[id] ?? {}), [key]: val }
    configs.value = { ...configs.value, [id]: next }
    localStorage.setItem(`plugin:${id}:config`, JSON.stringify(next))
  }

  function getConfig(id: string): Record<string, string> {
    return configs.value[id] ?? {}
  }

  /** 有効なプラグインのみ（ThreadView 等で使用） */
  const enabledPlugins = computed(() =>
    registeredPlugins.filter((p) => enabled.value[p.id]),
  )

  return { enabled, configs, setEnabled, setConfig, getConfig, enabledPlugins }
})
