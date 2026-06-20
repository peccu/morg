import { useQuery } from '@tanstack/vue-query'
import type { GmailLabel } from '@morg/shared'

// システムラベルの表示名マッピング
const SYSTEM_LABEL_NAMES: Record<string, string> = {
  INBOX: '受信トレイ',
  SENT: '送信済み',
  DRAFT: '下書き',
  STARRED: 'スター付き',
  IMPORTANT: '重要',
  TRASH: 'ゴミ箱',
  SPAM: 'スパム',
  UNREAD: '未読',
}

const SHOW_SYSTEM = ['INBOX', 'STARRED', 'IMPORTANT', 'SENT', 'DRAFT', 'TRASH']

export interface LabelItem {
  id: string
  name: string
  type: 'system' | 'user'
  query: string
}

async function fetchLabels(): Promise<GmailLabel[]> {
  const res = await fetch('/.netlify/functions/gmail-labels')
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as { labels: GmailLabel[] }
  return data.labels
}

export function useLabels() {
  const query = useQuery({
    queryKey: ['labels'],
    queryFn: fetchLabels,
    staleTime: 1000 * 60 * 10,
    select: (labels): LabelItem[] => {
      const system = labels
        .filter((l) => l.type === 'system' && SHOW_SYSTEM.includes(l.id))
        .sort((a, b) => SHOW_SYSTEM.indexOf(a.id) - SHOW_SYSTEM.indexOf(b.id))
        .map((l) => ({
          id: l.id,
          name: SYSTEM_LABEL_NAMES[l.id] ?? l.name,
          type: 'system' as const,
          query: `label:${l.id.toLowerCase()}`,
        }))

      const user = labels
        .filter((l) => l.type === 'user')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((l) => ({
          id: l.id,
          name: l.name,
          type: 'user' as const,
          query: `label:${l.name.replace(/ /g, '-')}`,
        }))

      return [...system, ...user]
    },
  })
  return query
}
