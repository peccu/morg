import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// registeredPlugins をモック
vi.mock('@/plugins', () => ({
  registeredPlugins: [
    { id: 'plug-a', name: 'Plugin A', defaultEnabled: true },
    { id: 'plug-b', name: 'Plugin B', defaultEnabled: false,
      configSchema: { webhookUrl: { label: 'URL', type: 'url' } } },
  ],
}))

import { usePluginsStore } from '@/stores/plugins'

describe('usePluginsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  test('defaultEnabled=true のプラグインは初期状態で有効', () => {
    const store = usePluginsStore()
    expect(store.enabled['plug-a']).toBe(true)
  })

  test('defaultEnabled=false のプラグインは初期状態で無効', () => {
    const store = usePluginsStore()
    expect(store.enabled['plug-b']).toBe(false)
  })

  test('setEnabled で有効/無効を切り替えられる', () => {
    const store = usePluginsStore()
    store.setEnabled('plug-a', false)
    expect(store.enabled['plug-a']).toBe(false)
    store.setEnabled('plug-a', true)
    expect(store.enabled['plug-a']).toBe(true)
  })

  test('setEnabled は localStorage に保存される', () => {
    const store = usePluginsStore()
    store.setEnabled('plug-b', true)
    expect(localStorage.getItem('plugin:plug-b:enabled')).toBe('true')
  })

  test('localStorage に保存済みの値が復元される', () => {
    localStorage.setItem('plugin:plug-a:enabled', 'false')
    const store = usePluginsStore()
    expect(store.enabled['plug-a']).toBe(false)
  })

  test('setConfig でキーと値を保存できる', () => {
    const store = usePluginsStore()
    store.setConfig('plug-b', 'webhookUrl', 'https://example.com')
    expect(store.getConfig('plug-b').webhookUrl).toBe('https://example.com')
  })

  test('setConfig は localStorage に JSON で保存される', () => {
    const store = usePluginsStore()
    store.setConfig('plug-b', 'webhookUrl', 'https://example.com')
    const stored = JSON.parse(localStorage.getItem('plugin:plug-b:config') ?? '{}')
    expect(stored.webhookUrl).toBe('https://example.com')
  })

  test('enabledPlugins は enabled なプラグインのみ返す', () => {
    const store = usePluginsStore()
    expect(store.enabledPlugins.map((p) => p.id)).toEqual(['plug-a'])
    store.setEnabled('plug-b', true)
    expect(store.enabledPlugins.map((p) => p.id)).toEqual(['plug-a', 'plug-b'])
  })
})
