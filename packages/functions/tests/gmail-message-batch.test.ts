import { describe, test, expect, vi, beforeEach } from 'vitest'
import { handler } from '../src/gmail-message-batch'
import type { HandlerEvent } from '@netlify/functions'

vi.mock('../src/lib/cookie', () => ({
  getSession: () => ({
    accessToken: 'test-token',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 3_600_000,
    email: 'test@example.com',
  }),
  makeSessionCookie: () => 'morg_session=mock',
}))

vi.mock('../src/lib/token', () => ({
  getValidToken: (s: { accessToken: string }) =>
    Promise.resolve({ token: s.accessToken, updatedSession: null }),
}))

const mockEvent = (body: object): HandlerEvent =>
  ({
    httpMethod: 'POST',
    headers: { cookie: 'morg_session=mock' },
    body: JSON.stringify(body),
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    path: '/.netlify/functions/gmail-message-batch',
    multiValueHeaders: {},
    isBase64Encoded: false,
    rawUrl: '',
    rawQuery: '',
    pathParameters: null,
    stateContext: null,
  }) as unknown as HandlerEvent

describe('gmail-message-batch handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))
  })

  test('rejects non-POST', async () => {
    const res = await handler({ ...mockEvent({}), httpMethod: 'GET' } as HandlerEvent, {} as never)
    expect(res?.statusCode).toBe(405)
  })

  test('returns 400 when messageIds missing', async () => {
    const res = await handler(mockEvent({ action: 'archive' }), {} as never)
    expect(res?.statusCode).toBe(400)
  })

  test('archive calls messages.modify with removeLabelIds INBOX', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)
    await handler(mockEvent({ messageIds: ['msg1'], action: 'archive' }), {} as never)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(fetchMock.mock.calls[0][0]).toContain('/messages/msg1/modify')
    expect(body.removeLabelIds).toContain('INBOX')
  })

  test('trash calls messages.trash endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)
    await handler(mockEvent({ messageIds: ['msg1'], action: 'trash' }), {} as never)
    expect(fetchMock.mock.calls[0][0]).toContain('/messages/msg1/trash')
  })

  test('markRead removes UNREAD label', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)
    await handler(mockEvent({ messageIds: ['msg1'], action: 'markRead' }), {} as never)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.removeLabelIds).toContain('UNREAD')
  })

  test('returns 200 on success with succeeded/failed', async () => {
    const res = await handler(mockEvent({ messageIds: ['a', 'b'], action: 'markUnread' }), {} as never)
    expect(res?.statusCode).toBe(200)
    expect(JSON.parse(res?.body ?? '{}')).toMatchObject({ ok: true, succeeded: 2, failed: 0 })
  })
})
