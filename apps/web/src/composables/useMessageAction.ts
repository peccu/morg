import { ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { BatchAction } from '@morg/shared'
import { applyThreadCacheUpdate } from '@/lib/thread-cache'
import { apiFetch } from '@/lib/api-fetch'

export function useMessageAction(threadId: () => string) {
  const queryClient = useQueryClient()
  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  async function execute(messageIds: string[], action: BatchAction, labelId?: string) {
    if (!messageIds.length) return
    isProcessing.value = true
    error.value = null
    try {
      const res = await apiFetch('/.netlify/functions/gmail-message-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, action, labelId }),
      })
      if (res.status >= 400) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const body = await res.json().catch(() => ({})) as { succeeded?: number; failed?: number }
      if (body.failed) error.value = `${body.failed}件の操作に失敗しました`

      // スレッド単位でリストキャッシュを更新
      applyThreadCacheUpdate(queryClient, [threadId()], action, labelId)
      // スレッド詳細は再フェッチして正確な状態に同期
      await queryClient.invalidateQueries({ queryKey: ['thread'] })
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isProcessing.value = false
    }
  }

  return { execute, isProcessing, error }
}
