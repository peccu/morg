import type { ThreadListItem, GmailThread, GmailMessageHeader } from '@morg/shared'

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function gFetch(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`${BASE}/${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gmail API error ${res.status}: ${text}`)
  }
  return res.json()
}

interface RawThreadsListResponse {
  threads?: Array<{ id: string; snippet: string }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

export async function listThreads(token: string, q: string, pageToken?: string, maxResults = 20) {
  const params: Record<string, string> = { q, maxResults: String(maxResults) }
  if (pageToken) params['pageToken'] = pageToken
  return gFetch('threads', token, params) as Promise<RawThreadsListResponse>
}

export async function getThread(token: string, id: string): Promise<GmailThread> {
  return gFetch(`threads/${id}`, token, {
    format: 'metadata',
    metadataHeaders: ['Subject', 'From', 'Date'].join(','),
  }) as Promise<GmailThread>
}

function header(headers: GmailMessageHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export function toThreadListItem(thread: GmailThread): ThreadListItem {
  const messages = thread.messages ?? []
  const first = messages[0]
  const last = messages[messages.length - 1]

  const allLabels = [...new Set(messages.flatMap((m) => m.labelIds ?? []))]

  return {
    id: last?.id ?? thread.id,
    threadId: thread.id,
    snippet: last?.snippet ?? thread.snippet ?? '',
    subject: header(first?.payload?.headers ?? [], 'Subject') || '(件名なし)',
    from: header(last?.payload?.headers ?? [], 'From'),
    date: header(last?.payload?.headers ?? [], 'Date'),
    labelIds: allLabels,
    unread: allLabels.includes('UNREAD'),
  }
}

export async function listThreadsWithMetadata(
  token: string,
  q: string,
  pageToken?: string,
  maxResults = 20,
) {
  const list = await listThreads(token, q, pageToken, maxResults)
  const ids = list.threads ?? []

  const threads = await Promise.all(ids.map((t) => getThread(token, t.id)))
  const items = threads.map(toThreadListItem)

  return {
    threads: items,
    nextPageToken: list.nextPageToken,
    resultSizeEstimate: list.resultSizeEstimate ?? 0,
  }
}
