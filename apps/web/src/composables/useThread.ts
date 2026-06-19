import { useQuery } from '@tanstack/vue-query'
import type { GmailThread } from '@morg/shared'
import type { Ref } from 'vue'

async function fetchThread(id: string): Promise<GmailThread> {
  const res = await fetch(`/.netlify/functions/gmail-thread?id=${id}`)
  if (!res.ok) throw new Error('Failed to fetch thread')
  return res.json()
}

export function useThread(id: Ref<string>) {
  return useQuery({
    queryKey: ['thread', id],
    queryFn: () => fetchThread(id.value),
    enabled: () => !!id.value,
    staleTime: 1000 * 60 * 5,
  })
}
