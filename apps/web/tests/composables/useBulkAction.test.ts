import { describe, test, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// QueryClient のモック
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

// applyThreadCacheUpdate のモック
vi.mock('@/lib/thread-cache', () => ({
  applyThreadCacheUpdate: vi.fn(),
}))

import { useBulkAction } from '@/composables/useBulkAction'
import { applyThreadCacheUpdate } from '@/lib/thread-cache'

const CHUNK_SIZE = 20

describe('useBulkAction', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(mockInvalidate).mockResolvedValue(undefined)
  })

  test('スレッドが空のとき fetch を呼ばない', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { execute } = useBulkAction()
    await execute([], 'archive')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  test(`${CHUNK_SIZE}件以下は fetch を1回だけ呼ぶ`, async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ succeeded: 5, failed: 0 }),
    }))

    const { execute } = useBulkAction()
    const ids = Array.from({ length: CHUNK_SIZE }, (_, i) => `t${i}`)
    await execute(ids, 'archive')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test(`${CHUNK_SIZE + 1}件は fetch を2回呼ぶ（チャンク分割）`, async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ succeeded: 1, failed: 0 }),
    }))

    const { execute } = useBulkAction()
    const ids = Array.from({ length: CHUNK_SIZE + 1 }, (_, i) => `t${i}`)
    await execute(ids, 'archive')

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('チャンクごとにキャッシュ更新が呼ばれる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ succeeded: 1, failed: 0 }),
    }))

    const { execute } = useBulkAction()
    const ids = Array.from({ length: CHUNK_SIZE * 3 }, (_, i) => `t${i}`)
    await execute(ids, 'trash')

    expect(applyThreadCacheUpdate).toHaveBeenCalledTimes(3)
  })

  test('isProcessing は実行中 true、完了後 false', async () => {
    let resolveFetch!: () => void
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>((resolve) => {
      resolveFetch = () => resolve({ status: 200, json: () => Promise.resolve({ succeeded: 1, failed: 0 }) } as Response)
    })))

    const { execute, isProcessing } = useBulkAction()
    expect(isProcessing.value).toBe(false)

    const p = execute(['t1'], 'archive')
    expect(isProcessing.value).toBe(true)

    resolveFetch()
    await p
    expect(isProcessing.value).toBe(false)
  })

  test('HTTP エラー時に error にメッセージが入る', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 500,
      json: () => Promise.resolve({ error: 'サーバーエラー' }),
    }))

    const { execute, error } = useBulkAction()
    await execute(['t1'], 'archive')

    expect(error.value).toBe('サーバーエラー')
  })
})
