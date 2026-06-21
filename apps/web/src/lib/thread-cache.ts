import type { QueryClient, InfiniteData } from '@tanstack/vue-query'
import type { BatchAction, ThreadListResponse, ThreadListItem } from '@morg/shared'

function updateThreads(
  threads: ThreadListItem[],
  idSet: Set<string>,
  action: BatchAction,
  labelId?: string,
): ThreadListItem[] {
  switch (action) {
    case 'trash':
    case 'archive':
      return threads.filter((t) => !idSet.has(t.threadId))
    case 'markRead':
      return threads.map((t) =>
        idSet.has(t.threadId)
          ? { ...t, unread: false, labelIds: t.labelIds.filter((l) => l !== 'UNREAD') }
          : t,
      )
    case 'markUnread':
      return threads.map((t) =>
        idSet.has(t.threadId)
          ? { ...t, unread: true, labelIds: t.labelIds.includes('UNREAD') ? t.labelIds : [...t.labelIds, 'UNREAD'] }
          : t,
      )
    case 'addLabel':
      if (!labelId) return threads
      return threads.map((t) =>
        idSet.has(t.threadId)
          ? { ...t, labelIds: t.labelIds.includes(labelId) ? t.labelIds : [...t.labelIds, labelId] }
          : t,
      )
    case 'removeLabel':
      if (!labelId) return threads
      return threads.map((t) =>
        idSet.has(t.threadId)
          ? { ...t, labelIds: t.labelIds.filter((l) => l !== labelId) }
          : t,
      )
    default:
      return threads
  }
}

export function applyThreadCacheUpdate(
  queryClient: QueryClient,
  threadIds: string[],
  action: BatchAction,
  labelId?: string,
) {
  const idSet = new Set(threadIds)
  queryClient.setQueriesData<InfiniteData<ThreadListResponse>>(
    { queryKey: ['threads'], exact: false },
    (old) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          threads: updateThreads(page.threads, idSet, action, labelId),
        })),
      }
    },
  )
}
