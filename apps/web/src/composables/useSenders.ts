import { computed } from 'vue'
import type { ThreadListItem } from '@morg/shared'

export interface SenderSummary {
  address: string  // always lowercase-normalized
  name: string     // most recent display name for this address
  count: number
  unread: number
}

function parseFrom(from: string): { name: string; address: string } {
  if (!from) return { name: '', address: '' }
  const m = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (m) {
    const name = m[1].replace(/^"|"$/g, '').trim()
    const address = m[2].trim().toLowerCase()
    return { name, address }
  }
  // Bare email address (no display name)
  const addr = from.trim().toLowerCase()
  return { name: from.trim(), address: addr }
}

export function useSenders(threads: () => ThreadListItem[]) {
  return computed<SenderSummary[]>(() => {
    const map = new Map<string, SenderSummary>()
    const latestDate = new Map<string, string>()

    for (const t of threads()) {
      if (!t.from) continue
      const { name, address } = parseFrom(t.from)
      if (!address) continue

      const existing = map.get(address)
      if (existing) {
        existing.count++
        if (t.unread) existing.unread++
        // Update display name when a more recent thread is encountered
        const prev = latestDate.get(address) ?? ''
        if (t.date && t.date > prev) {
          existing.name = name || address
          latestDate.set(address, t.date)
        }
      } else {
        map.set(address, { address, name: name || address, count: 1, unread: t.unread ? 1 : 0 })
        latestDate.set(address, t.date ?? '')
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  })
}
