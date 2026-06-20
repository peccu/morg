import { describe, test, expect } from 'vitest'
import { useSenders } from '@/composables/useSenders'
import type { ThreadListItem } from '@morg/shared'

function thread(from: string, unread = false): ThreadListItem {
  return {
    id: Math.random().toString(),
    threadId: Math.random().toString(),
    snippet: '',
    subject: 'Test',
    from,
    date: '',
    labelIds: [],
    unread,
  }
}

describe('useSenders', () => {
  test('counts threads per sender', () => {
    const threads = [
      thread('Alice <alice@example.com>'),
      thread('Alice <alice@example.com>'),
      thread('Bob <bob@example.com>'),
    ]
    const senders = useSenders(() => threads).value
    const alice = senders.find((s) => s.address === 'alice@example.com')
    expect(alice?.count).toBe(2)
    expect(senders.find((s) => s.address === 'bob@example.com')?.count).toBe(1)
  })

  test('counts unread per sender', () => {
    const threads = [
      thread('alice@example.com', true),
      thread('alice@example.com', false),
    ]
    const senders = useSenders(() => threads).value
    expect(senders[0].unread).toBe(1)
  })

  test('sorts by count descending', () => {
    const threads = [
      thread('a@x.com'), thread('b@x.com'), thread('b@x.com'), thread('b@x.com'),
    ]
    const senders = useSenders(() => threads).value
    expect(senders[0].address).toBe('b@x.com')
  })

  test('parses "Name <email>" format', () => {
    const senders = useSenders(() => [thread('"John Doe" <john@example.com>')]).value
    expect(senders[0].name).toBe('John Doe')
    expect(senders[0].address).toBe('john@example.com')
  })

  test('handles plain email address', () => {
    const senders = useSenders(() => [thread('nobody@example.com')]).value
    expect(senders[0].address).toBe('nobody@example.com')
    expect(senders[0].name).toBe('nobody@example.com')
  })

  test('deduplicates case-insensitively', () => {
    const threads = [thread('Alice@Example.COM'), thread('alice@example.com')]
    const senders = useSenders(() => threads).value
    expect(senders).toHaveLength(1)
    expect(senders[0].count).toBe(2)
  })

  test('skips threads without from', () => {
    const threads = [thread(''), thread('alice@example.com')]
    const senders = useSenders(() => threads).value
    expect(senders).toHaveLength(1)
  })
})
