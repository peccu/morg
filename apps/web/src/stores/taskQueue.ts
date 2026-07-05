import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useQueryClient } from '@tanstack/vue-query'
import type { BatchAction } from '@morg/shared'
import { apiFetch } from '@/lib/api-fetch'
import { applyThreadCacheUpdate } from '@/lib/thread-cache'

const CHUNK_SIZE = 20
const TIMING_WINDOW = 3

export interface QueueTask {
  id: string
  label: string
  action: BatchAction
  threadIds: string[]
  labelId?: string
  originPath: string
  status: 'pending' | 'running' | 'done' | 'error'
  processed: number
  total: number
  etaMs: number | null
  error: string | null
}

export const useTaskQueueStore = defineStore('taskQueue', () => {
  const queryClient = useQueryClient()
  const tasks = ref<QueueTask[]>([])
  const bannerCollapsed = ref(false)
  let _running = false

  const hasActiveTasks = computed(() =>
    tasks.value.some(t => t.status === 'pending' || t.status === 'running'),
  )

  const processingThreadIds = computed<Set<string>>(() => {
    const ids = new Set<string>()
    for (const t of tasks.value) {
      if (t.status === 'pending' || t.status === 'running') {
        for (const id of t.threadIds) ids.add(id)
      }
    }
    return ids
  })

  function toggleBanner() { bannerCollapsed.value = !bannerCollapsed.value }

  function enqueue(opts: {
    action: BatchAction
    threadIds: string[]
    labelId?: string
    label: string
    originPath: string
  }) {
    tasks.value.push({
      id: crypto.randomUUID(),
      ...opts,
      status: 'pending',
      processed: 0,
      total: opts.threadIds.length,
      etaMs: null,
      error: null,
    })
    bannerCollapsed.value = false
    _tryRunNext()
  }

  function dismiss(id: string) {
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  async function _tryRunNext() {
    if (_running) return
    const task = tasks.value.find(t => t.status === 'pending')
    if (!task) return
    _running = true
    task.status = 'running'
    try {
      await _runTask(task)
    } finally {
      _running = false
      // Re-read from store to avoid TS control-flow narrowing (`task.status` was narrowed to 'running')
      const id = task.id
      if (tasks.value.some(t => t.id === id && t.status === 'done')) {
        setTimeout(() => dismiss(id), 4000)
      }
      _tryRunNext()
    }
  }

  async function _runTask(task: QueueTask) {
    const recentDurations: number[] = []
    let totalFailed = 0
    try {
      for (let i = 0; i < task.threadIds.length; i += CHUNK_SIZE) {
        const chunk = task.threadIds.slice(i, i + CHUNK_SIZE)
        const start = Date.now()

        const res = await apiFetch('/.netlify/functions/gmail-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadIds: chunk, action: task.action, labelId: task.labelId }),
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

        task.processed = i + chunk.length
        applyThreadCacheUpdate(queryClient, chunk, task.action, task.labelId)

        const remaining = task.threadIds.length - task.processed
        if (remaining > 0) {
          const avg = recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length
          task.etaMs = avg * Math.ceil(remaining / CHUNK_SIZE)
        } else {
          task.etaMs = null
        }
      }

      if (totalFailed > 0) task.error = `${totalFailed}件の操作に失敗しました`
      await queryClient.invalidateQueries({ queryKey: ['thread'] })
      task.status = 'done'
    } catch (e) {
      task.error = e instanceof Error ? e.message : String(e)
      task.status = 'error'
    }
  }

  function retry(id: string) {
    const task = tasks.value.find(t => t.id === id)
    if (!task || task.status !== 'error') return
    const remaining = task.threadIds.slice(task.processed)
    if (remaining.length === 0) return
    dismiss(id)
    enqueue({
      action: task.action,
      threadIds: remaining,
      labelId: task.labelId,
      label: task.label,
      originPath: task.originPath,
    })
  }

  return { tasks, hasActiveTasks, processingThreadIds, bannerCollapsed, toggleBanner, enqueue, dismiss, retry }
})
