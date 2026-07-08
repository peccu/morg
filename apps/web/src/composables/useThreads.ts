import { computed, watch, reactive } from 'vue'
import type { Ref } from 'vue'
import type { ThreadListItem, ThreadListResponse, BatchAction } from '@morg/shared'
import { apiFetch } from '@/lib/api-fetch'
import { getQueryCache, setQueryCache, applyActionToList } from '@/lib/thread-db'
import { useDemoStore } from '@/stores/demo'

interface QueryState {
  threads: ThreadListItem[]
  nextToken: string | undefined
  fetching: boolean
  error: Error | null
  initialized: boolean
}

// Module-level reactive map — one entry per query string, shared across composable instances
const _cache = reactive(new Map<string, QueryState>())

function getState(q: string): QueryState {
  if (!_cache.has(q)) {
    _cache.set(q, { threads: [], nextToken: undefined, fetching: false, error: null, initialized: false })
  }
  return _cache.get(q)!
}

// Called by thread-cache.ts after each action to keep in-memory state consistent
export function applyActionToAllCaches(threadIds: string[], action: BatchAction, labelId?: string): void {
  const idSet = new Set(threadIds)
  for (const [, state] of _cache.entries()) {
    state.threads = applyActionToList(state.threads, idSet, action, labelId)
  }
}

// Called by demo store on enter/exit to avoid showing stale data
export function clearAllInMemoryCaches(): void {
  _cache.clear()
}

async function fetchPage(q: string, pageToken?: string): Promise<ThreadListResponse> {
  const params = new URLSearchParams({ q })
  if (pageToken) params.set('pageToken', pageToken)
  const res = await apiFetch(`/.netlify/functions/gmail-threads?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(`${res.status}: ${body.error ?? 'Unknown error'}`)
  }
  return res.json() as Promise<ThreadListResponse>
}

export function useThreads(q: Ref<string>) {
  const demo = useDemoStore()

  // ── Load: DB first, then page-1 API for new items ──
  async function loadQuery(query: string) {
    const state = getState(query)
    if (state.initialized) return

    state.error = null
    state.fetching = true

    // 1. Restore from IndexedDB immediately
    if (!demo.isDemo) {
      try {
        const cached = await getQueryCache(query)
        if (cached && q.value === query) {
          state.threads = cached.threads
          state.nextToken = cached.nextPageToken
        }
      } catch { /* ignore DB errors */ }
    }
    state.initialized = true

    // 2. Background: fetch page 1 to detect new/updated threads
    try {
      const page1 = await fetchPage(query)
      if (q.value !== query) return  // query changed while awaiting

      const existingIds = new Set(state.threads.map(t => t.threadId))

      // Threads in API page 1 but not in DB → new items (prepend)
      const brandNew = page1.threads.filter(t => !existingIds.has(t.threadId))
      // Threads in both API and DB → update with latest API snapshot (e.g. new replies)
      const refreshed = page1.threads.filter(t => existingIds.has(t.threadId))
      const refreshedIds = new Set(refreshed.map(t => t.threadId))

      state.threads = [
        ...brandNew,
        ...refreshed,
        ...state.threads.filter(t => !refreshedIds.has(t.threadId)),
      ]

      // If DB had no data, adopt API's nextToken; otherwise keep DB token
      if (brandNew.length + refreshed.length === state.threads.length) {
        state.nextToken = page1.nextPageToken
      }

      if (!demo.isDemo) {
        await setQueryCache(query, state.threads, state.nextToken).catch(() => {})
      }
    } catch (e) {
      if (q.value === query && state.threads.length === 0) {
        state.error = e instanceof Error ? e : new Error(String(e))
      }
    } finally {
      if (q.value === query) state.fetching = false
    }
  }

  // ── Fetch next page from API ──
  async function fetchNextPage() {
    const query = q.value
    const state = getState(query)
    if (!state.nextToken || state.fetching) return

    state.fetching = true
    try {
      const page = await fetchPage(query, state.nextToken)
      if (q.value !== query) return

      const existingIds = new Set(state.threads.map(t => t.threadId))
      const newItems = page.threads.filter(t => !existingIds.has(t.threadId))
      state.threads = [...state.threads, ...newItems]
      state.nextToken = page.nextPageToken

      if (!demo.isDemo) {
        await setQueryCache(query, state.threads, state.nextToken).catch(() => {})
      }
    } catch { /* silent */ } finally {
      if (q.value === query) state.fetching = false
    }
  }

  // ── Explicit reload: drop initialized flag and re-fetch ──
  async function reload() {
    const query = q.value
    const state = getState(query)
    state.initialized = false
    state.threads = []
    state.nextToken = undefined
    state.error = null
    await loadQuery(query)
  }

  // React to query changes
  watch(q, (newQ) => {
    const state = getState(newQ)
    if (!state.initialized && !state.fetching) loadQuery(newQ)
  }, { immediate: true })

  // ── Computed interface (compatible with previous TanStack shape) ──
  const stateRef = computed(() => getState(q.value))

  const data = computed(() => {
    const s = stateRef.value
    return {
      pages: [{ threads: s.threads, nextPageToken: s.nextToken }],
      pageParams: [undefined as string | undefined],
    }
  })

  const isFetching  = computed(() => stateRef.value.fetching)
  const isError     = computed(() => stateRef.value.error !== null)
  const error       = computed(() => stateRef.value.error)
  const hasNextPage = computed(() => !!stateRef.value.nextToken)

  return { data, isFetching, isError, error, fetchNextPage, hasNextPage, reload }
}
