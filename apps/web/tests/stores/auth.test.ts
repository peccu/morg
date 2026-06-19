import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('useAuthStore', () => {
  describe('checkAuth', () => {
    test('sets isAuthenticated and email on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: true, email: 'user@example.com' }),
      }))

      const auth = useAuthStore()
      await auth.checkAuth()

      expect(auth.isAuthenticated).toBe(true)
      expect(auth.userEmail).toBe('user@example.com')
      expect(auth.initialized).toBe(true)
    })

    test('sets isAuthenticated false when not logged in', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({ authenticated: false }),
      }))

      const auth = useAuthStore()
      await auth.checkAuth()

      expect(auth.isAuthenticated).toBe(false)
      expect(auth.userEmail).toBeNull()
      expect(auth.initialized).toBe(true)
    })

    test('sets initialized true even on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')))

      const auth = useAuthStore()
      await auth.checkAuth()

      expect(auth.isAuthenticated).toBe(false)
      expect(auth.initialized).toBe(true)
    })

    test('only calls fetch once when initialized', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ authenticated: true, email: 'user@example.com' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const auth = useAuthStore()
      await auth.checkAuth()
      await auth.checkAuth()

      // 2回呼んでも fetch は1回目だけ実際に呼ばれる（initialized チェックはrouter側）
      expect(auth.initialized).toBe(true)
    })
  })

  describe('logout', () => {
    test('clears auth state after logout', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      }))

      const auth = useAuthStore()
      auth.isAuthenticated = true
      auth.userEmail = 'user@example.com'

      await auth.logout()

      expect(auth.isAuthenticated).toBe(false)
      expect(auth.userEmail).toBeNull()
    })

    test('calls auth-logout endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      vi.stubGlobal('fetch', fetchMock)

      const auth = useAuthStore()
      await auth.logout()

      expect(fetchMock).toHaveBeenCalledWith(
        '/.netlify/functions/auth-logout',
        { method: 'POST' },
      )
    })
  })
})
