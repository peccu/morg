import { ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { BatchAction } from '@morg/shared'
import { applyThreadCacheUpdate } from '@/lib/thread-cache'

// Netlify 関数の10秒タイムアウトに収まるよう1リクエストあたりの上限を設定
// 20件 / 10並列 = 2バッチ × ~300ms ≈ 0.6秒 → 細かく進捗フィードバック
const CHUNK_SIZE = 20
// ETA 計算に使う直近チャンク数
const TIMING_WINDOW = 3

export function useBulkAction() {
  const queryClient = useQueryClient()
  const isProcessing = ref(false)
  const error = ref<string | null>(null)
  const progress = ref({ processed: 0, total: 0 })
  const etaMs = ref<number | null>(null)

  async function execute(threadIds: string[], action: BatchAction, labelId?: string) {
    if (!threadIds.length) return
    isProcessing.value = true
    error.value = null
    progress.value = { processed: 0, total: threadIds.length }
    etaMs.value = null

    const recentDurations: number[] = []
    let totalFailed = 0
    try {
      for (let i = 0; i < threadIds.length; i += CHUNK_SIZE) {
        const chunk = threadIds.slice(i, i + CHUNK_SIZE)
        const start = Date.now()

        const res = await fetch('/.netlify/functions/gmail-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadIds: chunk, action, labelId }),
        })

        const duration = Date.now() - start
        recentDurations.push(duration)
        if (recentDurations.length > TIMING_WINDOW) recentDurations.shift()

        if (res.status >= 400) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        const body = await res.json().catch(() => ({})) as { succeeded?: number; failed?: number }
        totalFailed += body.failed ?? 0

        progress.value = { ...progress.value, processed: i + chunk.length }
        applyThreadCacheUpdate(queryClient, chunk, action, labelId)

        // 残りチャンク数 × 直近平均時間で ETA を試算
        const remaining = threadIds.length - progress.value.processed
        if (remaining > 0) {
          const avg = recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length
          etaMs.value = avg * Math.ceil(remaining / CHUNK_SIZE)
        } else {
          etaMs.value = null
        }
      }
      if (totalFailed > 0) error.value = `${totalFailed}件の操作に失敗しました`
      await queryClient.invalidateQueries({ queryKey: ['thread'] })
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isProcessing.value = false
      progress.value = { processed: 0, total: 0 }
      etaMs.value = null
    }
  }

  return { execute, isProcessing, error, progress, etaMs }
}
