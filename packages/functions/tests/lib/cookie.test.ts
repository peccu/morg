import { describe, test, expect, beforeAll } from 'vitest'
import { encryptSession, decryptSession, parseCookies, makeSessionCookie, getSession } from '../../src/lib/cookie'

beforeAll(() => {
  process.env.COOKIE_SECRET = 'test-secret-key-for-unit-tests-32c'
})

const mockSession = {
  accessToken: 'ya29.test-access-token',
  refreshToken: '1//test-refresh-token',
  expiresAt: 1800000000000,
  email: 'test@example.com',
}

describe('encryptSession / decryptSession', () => {
  test('roundtrip returns original session', () => {
    const encrypted = encryptSession(mockSession)
    const decrypted = decryptSession(encrypted)
    expect(decrypted).toEqual(mockSession)
  })

  test('different calls produce different ciphertext', () => {
    const a = encryptSession(mockSession)
    const b = encryptSession(mockSession)
    expect(a).not.toBe(b)
  })

  test('decryptSession returns null for tampered data', () => {
    const encrypted = encryptSession(mockSession)
    const tampered = encrypted.slice(0, -4) + 'xxxx'
    expect(decryptSession(tampered)).toBeNull()
  })
})

describe('parseCookies', () => {
  test('parses single cookie', () => {
    expect(parseCookies('foo=bar')).toEqual({ foo: 'bar' })
  })

  test('parses multiple cookies', () => {
    const result = parseCookies('foo=bar; baz=qux; hello=world')
    expect(result).toEqual({ foo: 'bar', baz: 'qux', hello: 'world' })
  })

  test('handles value with = sign', () => {
    const result = parseCookies('token=abc=def')
    expect(result.token).toBe('abc=def')
  })

  test('returns empty object for null', () => {
    expect(parseCookies(null)).toEqual({})
  })
})

describe('makeSessionCookie', () => {
  test('includes security flags', () => {
    const cookie = makeSessionCookie(mockSession)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
  })

  test('contains encrypted session value', () => {
    const cookie = makeSessionCookie(mockSession)
    expect(cookie).toMatch(/^morg_session=/)
  })
})

describe('getSession', () => {
  test('returns session from valid cookie header', () => {
    const cookieValue = encodeURIComponent(encryptSession(mockSession))
    const header = `morg_session=${cookieValue}; other=stuff`
    expect(getSession(header)).toEqual(mockSession)
  })

  test('returns null when cookie missing', () => {
    expect(getSession(null)).toBeNull()
    expect(getSession('other=value')).toBeNull()
  })
})
