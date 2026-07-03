import { describe, test, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockInvalidate = vi.fn()
const mockGetQueryData = vi.fn().mockReturnValue(undefined)
const mockSetQueryData = vi.fn()
vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidate,
    getQueryData: mockGetQueryData,
    setQueryData: mockSetQueryData,
  }),
}))

vi.mock('@/lib/thread-cache', () => ({
  applyThreadCacheUpdate: vi.fn(),
}))

import { useTaskQueueStore } from '@/stores/taskQueue'

describe('useTaskQueueStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(mockInvalidate).mockResolvedValue(undefined)
  })

  test('初期状態は tasks が空', () => {
    const store = useTaskQueueStore()
    expect(store.tasks).toHaveLength(0)
  })

  test('enqueue でタスクが追加される', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ succeeded: 2, failed: 0 }),
    }))

    const store = useTaskQueueStore()
    store.enqueue({ action: 'archive', threadIds: ['t1', 't2'], label: 'アーカイブ (2)', originPath: '/inbox' })

    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0].action).toBe('archive')
    expect(store.tasks[0].total).toBe(2)
  })

  test('enqueue 直後にタスクが running になる', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Promise(() => {}), // never resolves
    ))

    const store = useTaskQueueStore()
    store.enqueue({ action: 'archive', threadIds: ['t1'], label: 'test', originPath: '/inbox' })

    expect(store.tasks[0].status).toBe('running')
  })

  test('hasActiveTasks は pending/running のとき true', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Promise(() => {})))

    const store = useTaskQueueStore()
    expect(store.hasActiveTasks).toBe(false)

    store.enqueue({ action: 'archive', threadIds: ['t1'], label: 'test', originPath: '/inbox' })
    expect(store.hasActiveTasks).toBe(true)
  })

  test('dismiss でタスクが削除される', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ succeeded: 1, failed: 0 }),
    }))

    const store = useTaskQueueStore()
    store.enqueue({ action: 'archive', threadIds: ['t1'], label: 'test', originPath: '/inbox' })
    const id = store.tasks[0].id

    store.dismiss(id)
    expect(store.tasks).toHaveLength(0)
  })

  test('API エラー時に status が error になる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 500,
      json: () => Promise.resolve({ error: 'サーバーエラー' }),
    }))

    const store = useTaskQueueStore()
    store.enqueue({ action: 'archive', threadIds: ['t1'], label: 'test', originPath: '/inbox' })

    // バッチが完了するまで待つ
    await vi.waitFor(() => expect(store.tasks[0].status).toBe('error'))
    expect(store.tasks[0].error).toBe('サーバーエラー')
  })

  test('正常完了後に status が done になる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ succeeded: 1, failed: 0 }),
    }))

    const store = useTaskQueueStore()
    store.enqueue({ action: 'archive', threadIds: ['t1'], label: 'test', originPath: '/inbox' })

    await vi.waitFor(() => expect(store.tasks[0]?.status).toBe('done'))
    expect(store.tasks[0].processed).toBe(1)
  })

  test('2つのタスクをエンキューすると2つ目は pending のまま1つ目の完了を待つ', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Promise(() => {}))) // never resolves

    const store = useTaskQueueStore()
    store.enqueue({ action: 'archive', threadIds: ['t1'], label: 'task1', originPath: '/inbox' })
    store.enqueue({ action: 'markRead', threadIds: ['t2'], label: 'task2', originPath: '/inbox' })

    expect(store.tasks[0].status).toBe('running')
    expect(store.tasks[1].status).toBe('pending')
  })

  test('retry: エラータスクの未処理分だけ新タスクとして再エンキューされる', async () => {
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++
      // 1回目は成功、2回目はエラー
      if (callCount === 1) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ succeeded: 20, failed: 0 }),
        })
      }
      return Promise.resolve({
        status: 500,
        json: () => Promise.resolve({ error: 'network error' }),
      })
    }))

    const store = useTaskQueueStore()
    // 21件 → chunk=20 で 2回リクエスト (1回目成功, 2回目失敗)
    const ids = Array.from({ length: 21 }, (_, i) => `t${i}`)
    store.enqueue({ action: 'trash', threadIds: ids, label: 'test', originPath: '/inbox' })

    await vi.waitFor(() => expect(store.tasks[0].status).toBe('error'))
    expect(store.tasks[0].processed).toBe(20)

    // リトライ: 残り1件
    store.retry(store.tasks[0].id)
    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0].total).toBe(1)
    expect(store.tasks[0].threadIds).toEqual(['t20'])
  })

  test('2つのタスクが逐次実行されて両方 done になる', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ succeeded: 1, failed: 0 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useTaskQueueStore()
    store.enqueue({ action: 'archive', threadIds: ['t1'], label: 'task1', originPath: '/inbox' })
    store.enqueue({ action: 'markRead', threadIds: ['t2'], label: 'task2', originPath: '/inbox' })

    await vi.waitFor(() => {
      expect(store.tasks[0].status).toBe('done')
      expect(store.tasks[1].status).toBe('done')
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
