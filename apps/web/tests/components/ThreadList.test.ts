import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ThreadList from '@/components/ThreadList.vue'
import type { ThreadListItem } from '@morg/shared'

vi.mock('@/stores/taskQueue', () => ({
  useTaskQueueStore: () => ({ bannerCollapsed: false, tasks: [] }),
}))

const mockThreads: ThreadListItem[] = [
  {
    id: 'm1',
    threadId: 't1',
    from: 'Alice <alice@example.com>',
    subject: 'Hello',
    snippet: 'snippet 1',
    date: '2024-01-01T00:00:00Z',
    unread: false,
    labelIds: ['INBOX'],
  },
  {
    id: 'm2',
    threadId: 't2',
    from: 'Bob <bob@example.com>',
    subject: 'World',
    snippet: 'snippet 2',
    date: '2024-01-02T00:00:00Z',
    unread: true,
    labelIds: ['INBOX', 'UNREAD'],
  },
]

function mountThreadList(overrides: Record<string, unknown> = {}) {
  return shallowMount(ThreadList, {
    props: {
      threads: mockThreads,
      isFetching: false,
      isError: false,
      error: null,
      hasNextPage: false,
      checkedIds: new Set<string>(),
      autoFetchStopped: false,
      autoFetchEnabled: false,
      autoFetchActive: false,
      ...overrides,
    },
  })
}

describe('ThreadList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  describe('選択解除ボタン', () => {
    test('選択済みがあっても「選択解除」ボタンは表示されない', () => {
      const wrapper = mountThreadList({ checkedIds: new Set(['t1']) })
      const buttons = wrapper.findAll('button')
      const deselect = buttons.find((b) => b.text() === '選択解除')
      expect(deselect).toBeUndefined()
    })

    test('全て選択ボタンは全選択済みのとき clearAll を emit する', async () => {
      const wrapper = mountThreadList({ checkedIds: new Set(['t1', 't2']) })
      const buttons = wrapper.findAll('button')
      const selectAllBtn = buttons.find((b) => b.text().includes('全て選択'))
      await selectAllBtn?.trigger('click')
      expect(wrapper.emitted('clearAll')).toBeTruthy()
    })
  })

  describe('処理中（isProcessing）の非インタラクティブ化', () => {
    test('isProcessing=false のとき 全て選択ボタンは有効', () => {
      const wrapper = mountThreadList({ isProcessing: false })
      const btn = wrapper.find('button[aria-label="全て選択"], button:has(span)')
      const buttons = wrapper.findAll('button')
      const selectAllBtn = buttons.find((b) => b.text().includes('全て選択'))
      expect(selectAllBtn?.attributes('disabled')).toBeUndefined()
    })

    test('isProcessing=true のとき 全て選択ボタンは disabled になる', () => {
      const wrapper = mountThreadList({ isProcessing: true })
      const buttons = wrapper.findAll('button')
      const selectAllBtn = buttons.find((b) => b.text().includes('全て選択'))
      expect(selectAllBtn?.attributes('disabled')).toBeDefined()
    })

    test('isProcessing=true のとき toggleSelectAll を呼んでも emit しない', async () => {
      const wrapper = mountThreadList({ isProcessing: true })
      const buttons = wrapper.findAll('button')
      const selectAllBtn = buttons.find((b) => b.text().includes('全て選択'))
      await selectAllBtn?.trigger('click')
      expect(wrapper.emitted('selectAll')).toBeFalsy()
      expect(wrapper.emitted('clearAll')).toBeFalsy()
    })

    test('isProcessing=false のとき 全て選択をクリックすると selectAll が emit される', async () => {
      const wrapper = mountThreadList({ isProcessing: false })
      const buttons = wrapper.findAll('button')
      const selectAllBtn = buttons.find((b) => b.text().includes('全て選択'))
      await selectAllBtn?.trigger('click')
      expect(wrapper.emitted('selectAll')).toBeTruthy()
      expect(wrapper.emitted('selectAll')?.[0]).toEqual([['t1', 't2']])
    })

    test('isProcessing=true のとき ThreadListItem に pointer-events-none が付く', () => {
      const wrapper = mountThreadList({ isProcessing: true })
      const items = wrapper.findAllComponents({ name: 'ThreadListItem' })
      expect(items.length).toBeGreaterThan(0)
      items.forEach((item) => {
        expect(item.classes()).toContain('pointer-events-none')
      })
    })

    test('isProcessing=false のとき ThreadListItem に pointer-events-none が付かない', () => {
      const wrapper = mountThreadList({ isProcessing: false })
      const items = wrapper.findAllComponents({ name: 'ThreadListItem' })
      items.forEach((item) => {
        expect(item.classes()).not.toContain('pointer-events-none')
      })
    })
  })

  describe('スクロールバー自動表示', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    test('スクロール前はスクロールコンテナに is-scrolling クラスが付かない', () => {
      const wrapper = mountThreadList()
      const scrollContainer = wrapper.find('.thread-list-scroll')
      expect(scrollContainer.classes()).not.toContain('is-scrolling')
    })

    test('scroll イベント発火後に is-scrolling クラスが付く', async () => {
      const wrapper = mountThreadList()
      const scrollContainer = wrapper.find('.thread-list-scroll')
      await scrollContainer.trigger('scroll')
      expect(scrollContainer.classes()).toContain('is-scrolling')
    })

    test('scroll 後 1000ms 経過すると is-scrolling が外れる', async () => {
      const wrapper = mountThreadList()
      const scrollContainer = wrapper.find('.thread-list-scroll')
      await scrollContainer.trigger('scroll')
      expect(scrollContainer.classes()).toContain('is-scrolling')
      vi.advanceTimersByTime(1000)
      await wrapper.vm.$nextTick()
      expect(scrollContainer.classes()).not.toContain('is-scrolling')
    })

    test('連続スクロールでタイマーがリセットされる', async () => {
      const wrapper = mountThreadList()
      const scrollContainer = wrapper.find('.thread-list-scroll')
      await scrollContainer.trigger('scroll')
      vi.advanceTimersByTime(500)
      await scrollContainer.trigger('scroll')
      vi.advanceTimersByTime(800)
      await wrapper.vm.$nextTick()
      // 2回目のスクロールから 800ms しか経っていないのでまだ is-scrolling
      expect(scrollContainer.classes()).toContain('is-scrolling')
      vi.advanceTimersByTime(200)
      await wrapper.vm.$nextTick()
      expect(scrollContainer.classes()).not.toContain('is-scrolling')
    })
  })
})
