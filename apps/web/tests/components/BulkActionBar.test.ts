import { describe, test, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockExecute = vi.fn()
vi.mock('@/composables/useBulkAction', () => ({
  useBulkAction: () => ({
    execute: mockExecute,
    isProcessing: ref(false),
    error: ref(null),
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
})
