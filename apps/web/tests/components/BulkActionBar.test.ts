import { describe, test, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockEnqueue = vi.fn()
vi.mock('@/stores/taskQueue', () => ({
  useTaskQueueStore: () => ({
    enqueue: mockEnqueue,
    tasks: [],
  }),
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn().mockReturnValue({ fullPath: '/inbox' }),
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
    const firstRow = rows.find((r) => r.text().includes('件選択中'))
    expect(firstRow?.text()).toContain('✕')
  })

  test('閉じるボタンで clear イベントが発行される', async () => {
    const wrapper = mountBar()
    const closeBtn = wrapper.findAll('button').find((b) => b.text() === '✕')
    await closeBtn?.trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  describe('アクションボタン', () => {
    test('アーカイブを押すと enqueue が呼ばれ選択解除される', async () => {
      const wrapper = mountBar()
      const archiveBtn = wrapper.findAll('button').find((b) => b.text() === 'アーカイブ')
      await archiveBtn?.trigger('click')
      expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({
        action: 'archive',
        threadIds: ['t1', 't2'],
        originPath: '/inbox',
      }))
      expect(wrapper.emitted('clear')).toHaveLength(1)
    })

    test('既読を押すと enqueue が markRead で呼ばれる', async () => {
      const wrapper = mountBar()
      const btn = wrapper.findAll('button').find((b) => b.text() === '既読')
      await btn?.trigger('click')
      expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ action: 'markRead' }))
    })

    test('未読を押すと enqueue が markUnread で呼ばれる', async () => {
      const wrapper = mountBar()
      const btn = wrapper.findAll('button').find((b) => b.text() === '未読')
      await btn?.trigger('click')
      expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ action: 'markUnread' }))
    })

    test('label にアクション名と件数が含まれる', async () => {
      const wrapper = mountBar()
      const archiveBtn = wrapper.findAll('button').find((b) => b.text() === 'アーカイブ')
      await archiveBtn?.trigger('click')
      const call = mockEnqueue.mock.calls[0][0]
      expect(call.label).toContain('アーカイブ')
      expect(call.label).toContain('2')
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

    test('キャンセルを押すとダイアログが閉じて enqueue は呼ばれない', async () => {
      const wrapper = mountBar()
      await wrapper.findAll('button').find((b) => b.text() === '削除')?.trigger('click')
      await wrapper.findAll('button').find((b) => b.text() === 'キャンセル')?.trigger('click')
      expect(wrapper.find('.bg-black\\/40').exists()).toBe(false)
      expect(mockEnqueue).not.toHaveBeenCalled()
    })

    test('削除するを押すと enqueue が trash で呼ばれ選択解除される', async () => {
      const wrapper = mountBar()
      await wrapper.findAll('button').find((b) => b.text() === '削除')?.trigger('click')
      await wrapper.findAll('button').find((b) => b.text() === '削除する')?.trigger('click')
      expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({
        action: 'trash',
        threadIds: ['t1', 't2'],
        originPath: '/inbox',
      }))
      expect(wrapper.emitted('clear')).toHaveLength(1)
    })

    test('確認ダイアログに選択件数が表示される', async () => {
      const wrapper = mountBar({ selectedIds: ['a', 'b', 'c'] })
      await wrapper.findAll('button').find((b) => b.text() === '削除')?.trigger('click')
      expect(wrapper.text()).toContain('3件を削除')
    })
  })
})
