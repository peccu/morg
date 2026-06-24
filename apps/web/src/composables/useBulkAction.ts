import { ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { BatchAction } from '@morg/shared'
import { applyThreadCacheUpdate } from '@/lib/thread-cache'

// Netlify 関数の10秒タイムアウトに収まるよう1リクエストあたりの上限を設定
// 20件 / 10並列 = 2バッチ × ~300ms ≈ 0.6秒 → 50件より細かく進捗フィードバック
const CHUNK_SIZE = 20

export function useBulkAction() {
  const queryClient = useQueryClient()
  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  async function execute(threadIds: string[], action: BatchAction, labelId?: string) {
    if (!threadIds.length) return
    isProcessing.value = true
    error.value = null
    let totalFailed = 0
    try {
      for (let i = 0; i < threadIds.length; i += CHUNK_SIZE) {
        const chunk = threadIds.slice(i, i + CHUNK_SIZE)
        const res = await fetch('/.netlify/functions/gmail-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadIds: chunk, action, labelId }),
        })
        if (res.status >= 400) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        const body = await res.json().catch(() => ({})) as { succeeded?: number; failed?: number }
        totalFailed += body.failed ?? 0
        // チャンクごとにキャッシュ更新 → 50件ずつリストから消える
        applyThreadCacheUpdate(queryClient, chunk, action, labelId)
      }
      if (totalFailed > 0) error.value = `${totalFailed}件の操作に失敗しました`
      await queryClient.invalidateQueries({ queryKey: ['thread'] })
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isProcessing.value = false
    }
  }

  return { execute, isProcessing, error }
}
