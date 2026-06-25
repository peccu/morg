import { describe, test, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockExecute = vi.fn()
const mockIsProcessing = ref(false)
const mockProgress = ref({ processed: 0, total: 0 })
const mockEtaMs = ref<number | null>(null)
vi.mock('@/composables/useBulkAction', () => ({
  useBulkAction: () => ({
    execute: mockExecute,
    isProcessing: mockIsProcessing,
    error: ref(null),
    progress: mockProgress,
    etaMs: mockEtaMs,
  }),
}))

import BulkActionBar from '@/components/BulkActionBar.vue'

const labels = [
  { id: 'Label_1', name: 'work', type: 'user' as const, query: 'label:work' },
]

function mountBar(overrides: Record<string, unknown> = {}) {
  return shallowMount(BulkActionBar, {
    props: {
      selectedIds: ['t1', 't2'],
      labels,
      ...overrides,
    },
  })
}

describe('BulkActionBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockExecute.mockResolvedValue(undefined)
    mockIsProcessing.value = false
    mockProgress.value = { processed: 0, total: 0 }
    mockEtaMs.value = null
  })

  test('selectedIds が空のとき何も表示しない', () => {
    const wrapper = mountBar({ selectedIds: [] })
    expect(wrapper.find('.bg-forest-50').exists()).toBe(false)
  })

  test('件数が1行目に表示される', () => {
    const wrapper = mountBar()
    expect(wrapper.text()).toContain('2件選択中')
  })

  test('閉じるボタンが1行目にある', () => {
    const wrapper = mountBar()
    const rows = wrapper.findAll('.flex')
    // 1行目（件数行）に ✕ ボタンが含まれる
    const firstRow = rows.find((r) => r.text().includes('件選択中'))
    expect(firstRow?.text()).toContain('✕')
  })

  test('アクションボタンが2行目（overflow-x-auto コンテナ）にある', () => {
    const wrapper = mountBar()
    const scrollRow = wrapper.find('.overflow-x-auto')
    expect(scrollRow.exists()).toBe(true)
    expect(scrollRow.text()).toContain('アーカイブ')
    expect(scrollRow.text()).toContain('削除')
    expect(scrollRow.text()).toContain('既読')
    expect(scrollRow.text()).toContain('未読')
  })

  test('閉じるボタンを押すと clear が emit される', async () => {
    const wrapper = mountBar()
    const closeBtn = wrapper.findAll('button').find((b) => b.text() === '✕')
    await closeBtn?.trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  describe('プログレスバー', () => {
    test('処理中でないときオーバーレイが表示されない', () => {
      const wrapper = mountBar()
      expect(wrapper.find('.bg-forest-50\\/90').exists()).toBe(false)
    })

    test('isProcessing=true のときオーバーレイが表示される', async () => {
      mockIsProcessing.value = true
      mockProgress.value = { processed: 10, total: 40 }
      const wrapper = mountBar()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.bg-forest-50\\/90').exists()).toBe(true)
      expect(wrapper.text()).toContain('10/40件処理中')
    })

    test('progressPct に応じたバーの幅が設定される', async () => {
      mockIsProcessing.value = true
      mockProgress.value = { processed: 20, total: 40 }
      const wrapper = mountBar()
      await wrapper.vm.$nextTick()
      const bar = wrapper.find('.bg-forest-600')
      expect(bar.attributes('style')).toContain('width: 50%')
    })

    test('etaMs が設定されているとき残り時間が表示される（秒）', async () => {
      mockIsProcessing.value = true
      mockProgress.value = { processed: 5, total: 20 }
      mockEtaMs.value = 15000
      const wrapper = mountBar()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('残り約15秒')
    })

    test('etaMs が60秒以上のとき分表示になる', async () => {
      mockIsProcessing.value = true
      mockProgress.value = { processed: 5, total: 20 }
      mockEtaMs.value = 90000
      const wrapper = mountBar()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('残り約2分')
    })

    test('etaMs が null のとき残り時間は表示されない', async () => {
      mockIsProcessing.value = true
      mockProgress.value = { processed: 5, total: 20 }
      mockEtaMs.value = null
      const wrapper = mountBar()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).not.toContain('残り約')
    })
  })

  describe('削除確認ダイアログ', () => {
    test('初期状態では確認ダイアログが表示されない', () => {
      const wrapper = mountBar()
      expect(wrapper.text()).not.toContain('削除する')
      expect(wrapper.find('.bg-black\\/40').exists()).toBe(false)
    })

    test('削除ボタンを押すと確認ダイアログが表示される', async () => {
      const wrapper = mountBar()
      const deleteBtn = wrapper.findAll('button').find((b) => b.text() === '削除')
      await deleteBtn?.trigger('click')
      expect(wrapper.find('.bg-black\\/40').exists()).toBe(true)
      expect(wrapper.text()).toContain('削除する')
      expect(wrapper.text()).toContain('キャンセル')
    })

    test('キャンセルを押すとダイアログが閉じて execute は呼ばれない', async () => {
      const wrapper = mountBar()
      await wrapper.findAll('button').find((b) => b.text() === '削除')?.trigger('click')
      await wrapper.findAll('button').find((b) => b.text() === 'キャンセル')?.trigger('click')
      expect(wrapper.find('.bg-black\\/40').exists()).toBe(false)
      expect(mockExecute).not.toHaveBeenCalled()
    })

    test('削除するを押すと execute が trash で呼ばれる', async () => {
      const wrapper = mountBar()
      await wrapper.findAll('button').find((b) => b.text() === '削除')?.trigger('click')
      await wrapper.findAll('button').find((b) => b.text() === '削除する')?.trigger('click')
      expect(mockExecute).toHaveBeenCalledWith(['t1', 't2'], 'trash', undefined)
    })

    test('確認ダイアログに選択件数が表示される', async () => {
      const wrapper = mountBar({ selectedIds: ['a', 'b', 'c'] })
      await wrapper.findAll('button').find((b) => b.text() === '削除')?.trigger('click')
      expect(wrapper.text()).toContain('3件を削除')
    })
  })
})
