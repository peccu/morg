---
description: 一覧→詳細の即時ナビゲーション実装パターン。一覧のキャッシュ済みデータで詳細画面を即座に表示し、フル取得完了まで意味あるプレビューを見せる。
invocation: explicit
---

# /instant-nav — 即時ナビゲーション実装スキル

一覧（リスト）画面から詳細画面に遷移するとき、**すでにローカルに持っているデータを使って UI を即座に表示し**、詳細 API のレスポンスを待つ間もユーザーに意味のあるコンテンツを見せる。

---

## このプロジェクトでの実装済み箇所

| ファイル | 役割 |
|---|---|
| `apps/web/src/composables/useThreads.ts` | `getThreadListItem(threadId)` — モジュールレベルキャッシュ `_cache` から `ThreadListItem` を返す |
| `apps/web/src/views/ThreadView.vue` | `cachedItem` computed で `getThreadListItem` を呼び、`isPending && cachedItem` の状態でスケルトンプレビューを表示 |
| `apps/web/tests/composables/useThreads.test.ts` | `getThreadListItem` の単体テスト |
| `apps/web/tests/views/ThreadView.test.ts` | スケルトン表示・アクションバー即時表示の component テスト |

---

## 実装パターン（一般手順）

### 1. 一覧キャッシュから単一アイテムを取り出す関数を追加

```typescript
// useThreads.ts に追加
export function getThreadListItem(threadId: string): ThreadListItem | undefined {
  for (const [, state] of _cache.entries()) {
    const found = state.threads.find(t => t.threadId === threadId)
    if (found) return found
  }
  return undefined
}

// テスト用シード関数も追加
export function _seedThreadsCache(query: string, threads: ThreadListItem[]): void {
  const state = getState(query)
  state.threads = [...threads]
  state.initialized = true
}
```

### 2. 詳細ビューで cachedItem を computed として取得

```typescript
import { getThreadListItem } from '@/composables/useThreads'

const cachedItem = computed(() => getThreadListItem(id.value))
```

### 3. フォールバックチェーンでサマリフィールドを埋める

```typescript
// From ヘッダー: 詳細データ → キャッシュ → 空文字
const firstFrom = computed(() =>
  header(thread.value?.messages[0]?.payload?.headers ?? [], 'From') || cachedItem.value?.from || ''
)
```

### 4. アクションバーを cachedItem があれば即表示

```html
<!-- thread が来る前でも操作可能 -->
<div v-if="thread || cachedItem" class="...action-bar...">
```

### 5. main コンテンツ: キャッシュあり → スケルトンプレビュー

```html
<!-- キャッシュ付きローディング: 本物の subject + sender + スケルトン本文 -->
<div v-if="isPending && cachedItem" class="max-w-4xl mx-auto px-3 py-4">
  <h1>{{ cachedItem.subject }}</h1>
  <div class="border rounded-lg overflow-hidden">
    <div class="bg-gray-50 border-b ...">
      <p>{{ parseName(cachedItem.from) }}</p>
      <time>{{ formatDate(cachedItem.date) }}</time>
    </div>
    <div class="px-3 py-3 space-y-2 animate-pulse">
      <div class="h-4 bg-gray-200 rounded w-full" />
      <div class="h-4 bg-gray-200 rounded w-5/6" />
      <div class="h-4 bg-gray-200 rounded w-4/6" />
    </div>
  </div>
</div>
<!-- キャッシュなし: テキストローディング -->
<div v-else-if="isPending" class="p-8 text-center text-gray-400">{{ t('status.loading') }}</div>
```

---

## テスト方針

### getThreadListItem の単体テスト

```typescript
beforeEach(() => clearAllInMemoryCaches())

test('returns item by threadId', () => {
  _seedThreadsCache('inbox', [makeItem('t1')])
  expect(getThreadListItem('t1')).toBeDefined()
})
test('returns undefined when not found', () => {
  expect(getThreadListItem('missing')).toBeUndefined()
})
```

### 詳細ビューのコンポーネントテスト

`vi.hoisted` で `mockGetThreadListItem` を作り、`vi.mock('@/composables/useThreads', ...)` で注入。
`useThread` は `{ data: ref(undefined), isPending: ref(true), ... }` をモック。

```typescript
const { mockGetThreadListItem } = vi.hoisted(() => ({
  mockGetThreadListItem: vi.fn<() => ThreadListItem | undefined>(),
}))
vi.mock('@/composables/useThreads', () => ({
  getThreadListItem: mockGetThreadListItem,
}))

test('shows subject from cache when isPending', () => {
  mockGetThreadListItem.mockReturnValue(cachedItem)
  const wrapper = shallowMount(ThreadView)
  expect(wrapper.text()).toContain(cachedItem.subject)
})
```

---

## 注意点

- `isPending` は TanStack Query で「データが一度もキャッシュされていない」状態。2回目以降の遷移では `thread` が即座に返るので `cachedItem` は使われない。
- アクションバーを先出しするとき、`plugin.threadActions` の `visible()` フィルターは `thread.value` が必要なため、`visible` 付きプラグインアクションは詳細データ到着後に追加表示される。これは許容範囲。
- `vi.mock` はファイル先頭にホイストされるため、モック関数を宣言する際は **`vi.hoisted`** を使う（`const mockFn = vi.fn()` をトップレベルに置くと `Cannot access before initialization` になる）。
