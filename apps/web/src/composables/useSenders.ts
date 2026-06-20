import { computed } from 'vue'
import type { ThreadListItem } from '@morg/shared'

export interface SenderSummary {
  address: string
  name: string
  count: number
  unread: number
}

function parseFrom(from: string): { name: string; address: string } {
  const m = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (m) return { name: m[1].replace(/^"|"$/g, '').trim(), address: m[2].trim() }
  return { name: from.trim(), address: from.trim() }
}

export function useSenders(threads: () => ThreadListItem[]) {
  return computed<SenderSummary[]>(() => {
    const map = new Map<string, SenderSummary>()
    for (const t of threads()) {
      if (!t.from) continue
      const { name, address } = parseFrom(t.from)
      const key = address.toLowerCase()
      const existing = map.get(key)
      if (existing) {
        existing.count++
        if (t.unread) existing.unread++
      } else {
        map.set(key, { address, name: name || address, count: 1, unread: t.unread ? 1 : 0 })
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  })
}
