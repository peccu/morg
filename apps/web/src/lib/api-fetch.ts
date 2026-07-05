import { useAuthStore } from '@/stores/auth'
import { useDemoStore } from '@/stores/demo'
import { demoFetch } from './demo-api'
import router from '@/router'

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const demo = useDemoStore()
  if (demo.isDemo) {
    const mocked = demoFetch(url, init)
    if (mocked) return mocked
  }

  const res = await fetch(url, init)
  if (res.status === 401) {
    const auth = useAuthStore()
    await auth.logout()
    router.push({ name: 'login' })
  }
  return res
}
