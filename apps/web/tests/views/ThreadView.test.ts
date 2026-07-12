import { describe, test, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import type { ThreadListItem } from '@morg/shared'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'thread-123' }, name: 'thread' }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}))

vi.mock('@/composables/useThread', () => ({
  useThread: () => ({
    data: ref(undefined),
    isPending: ref(true),
    isError: ref(false),
    error: ref(null),
  }),
}))

const { mockGetThreadListItem } = vi.hoisted(() => ({
  mockGetThreadListItem: vi.fn<() => ThreadListItem | undefined>(),
}))
vi.mock('@/composables/useThreads', () => ({
  getThreadListItem: mockGetThreadListItem,
}))

vi.mock('@/composables/useBulkAction', () => ({
  useBulkAction: () => ({ execute: vi.fn(), isProcessing: ref(false) }),
}))

vi.mock('@/composables/useMessageAction', () => ({
  useMessageAction: () => ({ execute: vi.fn(), isProcessing: ref(false) }),
}))

vi.mock('@/composables/useLabels', () => ({
  useLabels: () => ({ data: ref([]) }),
}))

vi.mock('@/composables/useAppAPI', () => ({
  useAppAPI: () => ({ notify: vi.fn(), back: vi.fn(), openUrl: vi.fn(), gmail: {} }),
}))

vi.mock('@/stores/plugins', () => ({
  usePluginsStore: () => ({ enabledPlugins: [], getConfig: vi.fn().mockReturnValue({}) }),
}))

vi.mock('@/stores/taskQueue', () => ({
  useTaskQueueStore: () => ({ processingThreadIds: new Set() }),
}))

import ThreadView from '@/views/ThreadView.vue'

const cachedItem: ThreadListItem = {
  id: 'm1',
  threadId: 'thread-123',
  subject: 'Cached Subject',
  from: 'Alice <alice@example.com>',
  snippet: 'a snippet',
  date: 'Mon, 01 Jan 2024 10:00:00 +0000',
  labelIds: ['INBOX'],
  unread: false,
}

function mount() {
  return shallowMount(ThreadView)
}

describe('ThreadView instant preview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  test('shows loading text when isPending and no cached item', () => {
    mockGetThreadListItem.mockReturnValue(undefined)
    const wrapper = mount()
    expect(wrapper.text()).toContain('読み込み中')
    expect(wrapper.text()).not.toContain('Cached Subject')
  })

  test('shows subject from cache when isPending and cached item exists', () => {
    mockGetThreadListItem.mockReturnValue(cachedItem)
    const wrapper = mount()
    expect(wrapper.text()).toContain('Cached Subject')
    expect(wrapper.text()).not.toContain('読み込み中')
  })

  test('shows sender name from cache when isPending and cached item exists', () => {
    mockGetThreadListItem.mockReturnValue(cachedItem)
    const wrapper = mount()
    expect(wrapper.text()).toContain('Alice')
  })

  test('shows action bar when cached item exists even before thread loads', () => {
    mockGetThreadListItem.mockReturnValue(cachedItem)
    const wrapper = mount()
    // Action bar buttons (archive etc.) should be visible
    const actionBar = wrapper.find('.bg-gray-50')
    expect(actionBar.exists()).toBe(true)
  })

  test('hides action bar when neither thread nor cached item is available', () => {
    mockGetThreadListItem.mockReturnValue(undefined)
    const wrapper = mount()
    // No action bar buttons should be rendered
    const buttons = wrapper.findAll('button')
    // Only the back button should exist
    expect(buttons.length).toBe(1)
    expect(buttons[0].text()).toContain('戻る')
  })
})
