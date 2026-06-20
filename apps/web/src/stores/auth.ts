import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const userEmail       = ref<string | null>(null)
  const initialized     = ref(false)
  const isLoggingIn     = ref(false)
  const loginError      = ref<string | null>(null)

  async function checkAuth() {
    try {
      const res  = await fetch('/.netlify/functions/auth-status')
      const data = await res.json()
      isAuthenticated.value = data.authenticated
      userEmail.value       = data.email ?? null
    } catch {
      isAuthenticated.value = false
      userEmail.value       = null
    } finally {
      initialized.value = true
    }
  }

  async function login() {
    isLoggingIn.value = true
    loginError.value  = null
    try {
      const res  = await fetch('/.netlify/functions/auth-google')
      const text = await res.text()

      let data: { url?: string; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        // JSON でない場合はレスポンス内容をそのままエラーとして表示
        throw new Error(`サーバーレスポンスが不正です (HTTP ${res.status}):\n${text.slice(0, 400)}`)
      }

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      // Google OAuth 画面へ遷移（ここでSPAは破棄される）
      window.location.href = data.url
    } catch (e) {
      loginError.value  = e instanceof Error ? e.message : String(e)
      isLoggingIn.value = false
    }
  }

  async function logout() {
    await fetch('/.netlify/functions/auth-logout', { method: 'POST' })
    isAuthenticated.value = false
    userEmail.value       = null
  }

  return { isAuthenticated, initialized, userEmail, isLoggingIn, loginError, checkAuth, login, logout }
})
