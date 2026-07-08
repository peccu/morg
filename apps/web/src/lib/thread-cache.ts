import type { BatchAction } from '@morg/shared'
import { applyActionToAllCaches } from '@/composables/useThreads'
import { applyActionToDb } from '@/lib/thread-db'

// Update both the live in-memory reactive caches and the IndexedDB persistence layer.
// The queryClient parameter is kept for call-site compatibility but is no longer used
// here — thread details are invalidated separately in taskQueue.ts.
export function applyThreadCacheUpdate(
  _queryClient: unknown,
  threadIds: string[],
  action: BatchAction,
  labelId?: string,
): void {
  // Immediate in-memory update so the UI reflects the change at once
  applyActionToAllCaches(threadIds, action, labelId)

  // Persist asynchronously — fire-and-forget is fine here
  applyActionToDb(threadIds, action, labelId).catch(() => {})
}
