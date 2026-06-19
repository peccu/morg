import { describe, test, expect } from 'vitest'
import { toThreadListItem } from '../../src/lib/gmail'
import type { GmailThread } from '@morg/shared'

function makeThread(overrides: Partial<GmailThread> = {}): GmailThread {
  return {
    id: 'thread-1',
    historyId: '1234',
    snippet: 'Hello there...',
    messages: [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        labelIds: ['INBOX', 'UNREAD'],
        snippet: 'Hello there...',
        payload: {
          partId: '',
          mimeType: 'text/plain',
          headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'Date', value: 'Mon, 01 Jan 2024 10:00:00 +0000' },
          ],
          body: { size: 0 },
        },
        sizeEstimate: 100,
        internalDate: '1704067200000',
      },
    ],
    ...overrides,
  }
}

describe('toThreadListItem', () => {
  test('extracts subject from first message headers', () => {
    const item = toThreadListItem(makeThread())
    expect(item.subject).toBe('Test Subject')
  })

  test('extracts from and date from last message', () => {
    const thread = makeThread()
    thread.messages.push({
      ...thread.messages[0],
      id: 'msg-2',
      payload: {
        ...thread.messages[0].payload,
        headers: [
          { name: 'Subject', value: 'Re: Test Subject' },
          { name: 'From', value: 'reply@example.com' },
          { name: 'Date', value: 'Tue, 02 Jan 2024 10:00:00 +0000' },
        ],
      },
    })
    const item = toThreadListItem(thread)
    expect(item.from).toBe('reply@example.com')
    expect(item.date).toBe('Tue, 02 Jan 2024 10:00:00 +0000')
  })

  test('marks unread when any message has UNREAD label', () => {
    expect(toThreadListItem(makeThread())).toMatchObject({ unread: true })
  })

  test('marks read when no message has UNREAD label', () => {
    const thread = makeThread()
    thread.messages[0].labelIds = ['INBOX']
    expect(toThreadListItem(thread)).toMatchObject({ unread: false })
  })

  test('uses fallback subject when header missing', () => {
    const thread = makeThread()
    thread.messages[0].payload.headers = []
    const item = toThreadListItem(thread)
    expect(item.subject).toBe('(件名なし)')
  })

  test('aggregates labels from all messages', () => {
    const thread = makeThread()
    thread.messages.push({
      ...thread.messages[0],
      id: 'msg-2',
      labelIds: ['SENT'],
    })
    const item = toThreadListItem(thread)
    expect(item.labelIds).toContain('INBOX')
    expect(item.labelIds).toContain('UNREAD')
    expect(item.labelIds).toContain('SENT')
  })
})
