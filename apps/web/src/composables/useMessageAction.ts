import { ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { BatchAction } from '@morg/shared'

export function useMessageAction(threadId: () => string) {
  const queryClient = useQueryClient()
  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  async function execute(messageIds: string[], action: BatchAction, labelId?: string) {
    if (!messageIds.length) return
    isProcessing.value = true
    error.value = null
    try {
      const res = await fetch('/.netlify/functions/gmail-message-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, action, labelId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      // ['thread'] prefix match — Ref vs string の不一致を避けるため prefix で一括 invalidate
      await queryClient.invalidateQueries({ queryKey: ['thread'] })
      await queryClient.invalidateQueries({ queryKey: ['threads'] })
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isProcessing.value = false
    }
  }

  return { execute, isProcessing, error }
}
