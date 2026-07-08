import { ref, computed } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

// ── Singletons (shared across all composable instances) ──────────────────────
let _swState: ReturnType<typeof useRegisterSW> | null = null
let _registration: ServiceWorkerRegistration | undefined
const _hasVersionUpdate = ref(false)

async function _fetchRemoteBuildDate(): Promise<string | null> {
  try {
    // cache-bust with timestamp so neither SW nor browser cache serves a stale file
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as { buildDate?: string }
    return data.buildDate ?? null
  } catch {
    return null
  }
}

// Returns true when a newer version is detected.
// Also triggers the SW update in the background so it's ready when the user
// clicks "Update Now".
export async function checkForUpdate(): Promise<boolean> {
  const remote = await _fetchRemoteBuildDate()
  if (!remote || remote === __BUILD_DATE__) return false

  _hasVersionUpdate.value = true
  _registration?.update().catch(() => {})   // download new SW silently
  return true
}

// ── Composable ────────────────────────────────────────────────────────────────
export function useAppUpdate() {
  if (!_swState) {
    _swState = useRegisterSW({
      onRegistered(reg) {
        _registration = reg
        // Poll via version.json every hour — much faster than reg.update()
        setInterval(() => checkForUpdate(), 60 * 60 * 1000)
      },
    })
  }

  // needRefresh = SW detected waiting worker  OR  version.json mismatch
  const needRefresh = computed(() => (_swState!.needRefresh.value) || _hasVersionUpdate.value)

  async function updateServiceWorker() {
    if (_swState!.needRefresh.value) {
      // A waiting SW is ready — activate it and reload
      await _swState!.updateServiceWorker(true)
    } else {
      // version.json mismatch: SW may still be downloading; trigger then reload
      await _registration?.update().catch(() => {})
      location.reload()
    }
  }

  return { needRefresh, updateServiceWorker, checkForUpdate }
}
