import { describe, test, expect, vi, beforeEach } from 'vitest'
import { handler } from '../src/gmail-batch'
import type { HandlerEvent } from '@netlify/functions'

// セッションCookieをモック
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
  getValidToken: (s: { accessToken: string }) => Promise.resolve({ token: s.accessToken, updatedSession: null }),
}))

function makeEvent(body: object, method = 'POST'): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers: { cookie: 'morg_session=mock' },
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    path: '/.netlify/functions/gmail-batch',
    multiValueHeaders: {},
    isBase64Encoded: false,
    rawUrl: '',
    rawQuery: '',
    pathParameters: null,
    stateContext: null,
  } as unknown as HandlerEvent
}

describe('gmail-batch handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })

  test('405 for non-POST requests', async () => {
    const res = await handler(makeEvent({}, 'GET'), {} as never)
    expect(res?.statusCode).toBe(405)
  })

  test('400 when threadIds missing', async () => {
    const res = await handler(makeEvent({ action: 'archive' }), {} as never)
    expect(res?.statusCode).toBe(400)
  })

  test('400 when action missing', async () => {
    const res = await handler(makeEvent({ threadIds: ['id1'] }), {} as never)
    expect(res?.statusCode).toBe(400)
  })

  test('archive calls modify with removeLabelIds=[INBOX]', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await handler(makeEvent({ threadIds: ['t1', 't2'], action: 'archive' }), {} as never)

    const calls = fetchMock.mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0][0]).toContain('t1/modify')
    const body = JSON.parse(calls[0][1].body)
    expect(body.removeLabelIds).toContain('INBOX')
  })

  test('trash calls trash endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await handler(makeEvent({ threadIds: ['t1'], action: 'trash' }), {} as never)

    expect(fetchMock.mock.calls[0][0]).toContain('t1/trash')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  test('markRead removes UNREAD label', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await handler(makeEvent({ threadIds: ['t1'], action: 'markRead' }), {} as never)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.removeLabelIds).toContain('UNREAD')
  })

  test('returns ok:true with succeeded/failed on success', async () => {
    const res = await handler(makeEvent({ threadIds: ['t1', 't2'], action: 'markRead' }), {} as never)
    expect(res?.statusCode).toBe(200)
    const body = JSON.parse(res?.body ?? '{}')
    expect(body.ok).toBe(true)
    expect(body.succeeded).toBe(2)
    expect(body.failed).toBe(0)
  })
})
