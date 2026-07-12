import { describe, test, expect, beforeEach } from 'vitest'
import { getThreadListItem, clearAllInMemoryCaches, _seedThreadsCache } from '@/composables/useThreads'
import type { ThreadListItem } from '@morg/shared'

function makeItem(threadId: string, overrides: Partial<ThreadListItem> = {}): ThreadListItem {
  return {
    id: `m_${threadId}`,
    threadId,
    snippet: 'snippet text',
    subject: 'Test Subject',
    from: 'Alice <alice@example.com>',
    date: 'Mon, 01 Jan 2024 00:00:00 +0000',
    labelIds: ['INBOX'],
    unread: false,
    ...overrides,
  }
}

describe('getThreadListItem', () => {
  beforeEach(() => {
    clearAllInMemoryCaches()
  })

  test('returns undefined when cache is empty', () => {
    expect(getThreadListItem('thread-1')).toBeUndefined()
  })

  test('returns the item matching the threadId', () => {
    const item = makeItem('thread-1')
    _seedThreadsCache('inbox', [item, makeItem('thread-2')])
    expect(getThreadListItem('thread-1')).toEqual(item)
  })

  test('returns undefined when threadId is not in cache', () => {
    _seedThreadsCache('inbox', [makeItem('thread-1')])
    expect(getThreadListItem('missing')).toBeUndefined()
  })

  test('searches across multiple queries', () => {
    _seedThreadsCache('inbox', [makeItem('thread-1')])
    _seedThreadsCache('is:starred', [makeItem('thread-2')])
    expect(getThreadListItem('thread-2')).toBeDefined()
    expect(getThreadListItem('thread-2')?.threadId).toBe('thread-2')
  })

  test('returns the first match when same threadId appears in multiple queries', () => {
    const item1 = makeItem('thread-x', { subject: 'First' })
    const item2 = makeItem('thread-x', { subject: 'Second' })
    _seedThreadsCache('inbox', [item1])
    _seedThreadsCache('all', [item2])
    const result = getThreadListItem('thread-x')
    expect(result).toBeDefined()
    expect(['First', 'Second']).toContain(result?.subject)
  })

  test('returns undefined after cache is cleared', () => {
    _seedThreadsCache('inbox', [makeItem('thread-1')])
    clearAllInMemoryCaches()
    expect(getThreadListItem('thread-1')).toBeUndefined()
  })
})
