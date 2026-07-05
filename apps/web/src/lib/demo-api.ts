import { DEMO_LABELS, DEMO_THREAD_LIST, getDemoThread, getDemoThreadList } from './demo-data'

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function demoFetch(url: string, init?: RequestInit): Response | null {
  const path = url.split('?')[0]
  const search = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams()

  if (path.endsWith('gmail-threads')) {
    const q = search.get('q') ?? 'in:inbox'
    const sender = search.get('sender')
    let list = getDemoThreadList(q)
    if (sender) list = list.filter(t => t.from.toLowerCase().includes(sender.toLowerCase()))
    return ok({ threads: list, nextPageToken: undefined, resultSizeEstimate: list.length })
  }

  if (path.endsWith('gmail-thread')) {
    const id = search.get('id') ?? ''
    const thread = getDemoThread(id)
    if (!thread) return new Response('not found', { status: 404 })
    return ok(thread)
  }

  if (path.endsWith('gmail-labels')) {
    return ok(DEMO_LABELS)
  }

  if (path.endsWith('gmail-batch') || path.endsWith('gmail-message-batch')) {
    let n = 1
    try {
      const body = init?.body ? JSON.parse(init.body as string) : {}
      n = (body.threadIds ?? body.messageIds ?? []).length
    } catch { /* ignore */ }
    return ok({ succeeded: n, failed: 0 })
  }

  // auth-status — report as authenticated in demo
  if (path.endsWith('auth-status')) {
    return ok({ authenticated: true, email: 'demo@morg.example' })
  }

  // Fallback: success with empty object
  return ok({})
}

export function filterDemoSenders(threads = DEMO_THREAD_LIST) {
  return threads
}
