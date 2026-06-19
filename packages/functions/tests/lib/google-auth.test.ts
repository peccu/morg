import { describe, test, expect, beforeAll } from 'vitest'
import { buildAuthUrl, GMAIL_SCOPES } from '../../src/lib/google-auth'

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:8888/.netlify/functions/auth-callback'
})

describe('buildAuthUrl', () => {
  test('returns valid Google OAuth URL', () => {
    const url = buildAuthUrl('test-state-123')
    expect(url).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/)
  })

  test('includes required OAuth params', () => {
    const url = new URL(buildAuthUrl('my-state'))
    expect(url.searchParams.get('client_id')).toBe(process.env.GOOGLE_CLIENT_ID)
    expect(url.searchParams.get('redirect_uri')).toBe(process.env.GOOGLE_REDIRECT_URI)
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('state')).toBe('my-state')
  })

  test('requests offline access to get refresh_token', () => {
    const url = new URL(buildAuthUrl('s'))
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
  })

  test('includes all required Gmail scopes', () => {
    const url = new URL(buildAuthUrl('s'))
    const scope = url.searchParams.get('scope') ?? ''
    for (const s of GMAIL_SCOPES) {
      expect(scope).toContain(s)
    }
  })
})
