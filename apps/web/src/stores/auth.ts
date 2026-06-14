import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const userEmail = ref<string | null>(null)

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/status')
      const data = await res.json()
      isAuthenticated.value = data.authenticated
      userEmail.value = data.email ?? null
    } catch {
      isAuthenticated.value = false
      userEmail.value = null
    }
  }

  function login() {
    window.location.href = '/.netlify/functions/auth-google'
  }

  async function logout() {
    await fetch('/.netlify/functions/auth-logout', { method: 'POST' })
    isAuthenticated.value = false
    userEmail.value = null
  }

  return { isAuthenticated, userEmail, checkAuth, login, logout }
})
