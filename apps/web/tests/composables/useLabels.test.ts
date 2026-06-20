import { describe, test, expect } from 'vitest'
// useLabels の select 変換ロジックを直接テスト
import type { GmailLabel } from '@morg/shared'

// select 関数と同じロジックを抽出してテスト
const SYSTEM_LABEL_NAMES: Record<string, string> = {
  INBOX: '受信トレイ', SENT: '送信済み', DRAFT: '下書き',
  STARRED: 'スター付き', IMPORTANT: '重要', TRASH: 'ゴミ箱', SPAM: 'スパム', UNREAD: '未読',
}
const SHOW_SYSTEM = ['INBOX', 'STARRED', 'IMPORTANT', 'SENT', 'DRAFT', 'TRASH']

function transformLabels(labels: GmailLabel[]) {
  const system = labels
    .filter((l) => l.type === 'system' && SHOW_SYSTEM.includes(l.id))
    .sort((a, b) => SHOW_SYSTEM.indexOf(a.id) - SHOW_SYSTEM.indexOf(b.id))
    .map((l) => ({ id: l.id, name: SYSTEM_LABEL_NAMES[l.id] ?? l.name, type: 'system' as const, query: `label:${l.id.toLowerCase()}` }))
  const user = labels
    .filter((l) => l.type === 'user')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((l) => ({ id: l.id, name: l.name, type: 'user' as const, query: `label:${l.name.replace(/ /g, '-')}` }))
  return [...system, ...user]
}

const mockLabels: GmailLabel[] = [
  { id: 'INBOX', name: 'INBOX', type: 'system' },
  { id: 'SENT', name: 'SENT', type: 'system' },
  { id: 'SPAM', name: 'SPAM', type: 'system' },
  { id: 'Label_1', name: 'work', type: 'user' },
  { id: 'Label_2', name: 'personal', type: 'user' },
]

describe('label transform', () => {
  test('renames system labels to Japanese', () => {
    const items = transformLabels(mockLabels)
    expect(items.find((l) => l.id === 'INBOX')?.name).toBe('受信トレイ')
    expect(items.find((l) => l.id === 'SENT')?.name).toBe('送信済み')
  })

  test('excludes SPAM from displayed system labels', () => {
    const items = transformLabels(mockLabels)
    expect(items.find((l) => l.id === 'SPAM')).toBeUndefined()
  })

  test('orders system labels by SHOW_SYSTEM array', () => {
    const items = transformLabels(mockLabels)
    const systemItems = items.filter((l) => l.type === 'system')
    expect(systemItems[0].id).toBe('INBOX')
    expect(systemItems[1].id).toBe('SENT')
  })

  test('includes user labels sorted alphabetically', () => {
    const items = transformLabels(mockLabels)
    const userItems = items.filter((l) => l.type === 'user')
    expect(userItems[0].name).toBe('personal')
    expect(userItems[1].name).toBe('work')
  })

  test('builds correct query for user label with spaces', () => {
    const labels: GmailLabel[] = [{ id: 'Label_3', name: 'my label', type: 'user' }]
    const items = transformLabels(labels)
    expect(items[0].query).toBe('label:my-label')
  })
})
