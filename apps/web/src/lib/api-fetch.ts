import { useAuthStore } from '@/stores/auth'
import router from '@/router'

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init)
  if (res.status === 401) {
    const auth = useAuthStore()
    await auth.logout()
    router.push({ name: 'login' })
  }
  return res
}
