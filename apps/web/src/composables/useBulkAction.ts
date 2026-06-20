import { ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type { BatchAction } from '@morg/shared'

export function useBulkAction() {
  const queryClient = useQueryClient()
  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  async function execute(threadIds: string[], action: BatchAction, labelId?: string) {
    if (!threadIds.length) return
    isProcessing.value = true
    error.value = null
    try {
      const res = await fetch('/.netlify/functions/gmail-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadIds, action, labelId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      await queryClient.invalidateQueries({ queryKey: ['threads'] })
      await queryClient.invalidateQueries({ queryKey: ['thread'] })
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isProcessing.value = false
    }
  }

  return { execute, isProcessing, error }
}
