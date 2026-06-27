import { describe, test, expect, vi, beforeEach } from 'vitest'
import { handler } from '../src/gmail-labels'
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
  InvalidGrantError: class InvalidGrantError extends Error {
    constructor() { super('invalid_grant') }
  },
}))

const mockEvent: HandlerEvent = {
  httpMethod: 'GET',
  headers: { cookie: 'morg_session=mock' },
  body: null,
  queryStringParameters: {},
  multiValueQueryStringParameters: {},
  path: '/.netlify/functions/gmail-labels',
  multiValueHeaders: {},
  isBase64Encoded: false,
  rawUrl: '',
  rawQuery: '',
  pathParameters: null,
  stateContext: null,
} as unknown as HandlerEvent

describe('gmail-labels handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        labels: [
          { id: 'INBOX', name: 'INBOX', type: 'system' },
          { id: 'Label_1', name: 'work', type: 'user' },
        ],
      }),
    }))
  })

  test('returns labels on success', async () => {
    const res = await handler(mockEvent, {} as never)
    expect(res?.statusCode).toBe(200)
    const body = JSON.parse(res?.body ?? '{}')
    expect(body.labels).toHaveLength(2)
  })

  test('calls Gmail labels endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ labels: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    await handler(mockEvent, {} as never)
    expect(fetchMock.mock.calls[0][0]).toContain('/gmail/v1/users/me/labels')
  })

  test('returns 500 with error message on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    }))
    const res = await handler(mockEvent, {} as never)
    expect(res?.statusCode).toBe(500)
    expect(JSON.parse(res?.body ?? '{}')).toHaveProperty('error')
  })
})
