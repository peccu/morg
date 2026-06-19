import { useInfiniteQuery } from '@tanstack/vue-query'
import type { ThreadListResponse } from '@morg/shared'
import type { Ref } from 'vue'

async function fetchThreads(q: string, pageToken?: string): Promise<ThreadListResponse> {
  const params = new URLSearchParams({ q })
  if (pageToken) params.set('pageToken', pageToken)
  const res = await fetch(`/.netlify/functions/gmail-threads?${params}`)
  if (!res.ok) throw new Error('Failed to fetch threads')
  return res.json()
}

export function useThreads(q: Ref<string>) {
  return useInfiniteQuery({
    queryKey: ['threads', q],
    queryFn: ({ pageParam }) => fetchThreads(q.value, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    staleTime: 1000 * 60,
  })
}
