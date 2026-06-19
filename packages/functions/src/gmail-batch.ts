import type { Handler } from '@netlify/functions'
import type { BatchOperationRequest } from '@morg/shared'
import { getSession, makeSessionCookie } from './lib/cookie.js'
import { getValidToken } from './lib/token.js'

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function modifyThread(
  token: string,
  threadId: string,
  addLabelIds: string[],
  removeLabelIds: string[],
) {
  const res = await fetch(`${BASE}/threads/${threadId}/modify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ addLabelIds, removeLabelIds }),
  })
  if (!res.ok) throw new Error(`modify failed for ${threadId}: ${res.status}`)
}

async function trashThread(token: string, threadId: string) {
  const res = await fetch(`${BASE}/threads/${threadId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`trash failed for ${threadId}: ${res.status}`)
}

async function applyAction(token: string, req: BatchOperationRequest) {
  const { threadIds, action, labelId } = req
  switch (action) {
    case 'archive':
      return Promise.all(threadIds.map((id) => modifyThread(token, id, [], ['INBOX'])))
    case 'trash':
      return Promise.all(threadIds.map((id) => trashThread(token, id)))
    case 'markRead':
      return Promise.all(threadIds.map((id) => modifyThread(token, id, [], ['UNREAD'])))
    case 'markUnread':
      return Promise.all(threadIds.map((id) => modifyThread(token, id, ['UNREAD'], [])))
    case 'addLabel':
      if (!labelId) throw new Error('labelId required')
      return Promise.all(threadIds.map((id) => modifyThread(token, id, [labelId], [])))
    case 'removeLabel':
      if (!labelId) throw new Error('labelId required')
      return Promise.all(threadIds.map((id) => modifyThread(token, id, [], [labelId])))
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const session = getSession(event.headers['cookie'] ?? null)
  if (!session) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthenticated' }) }
  }

  let req: BatchOperationRequest
  try {
    req = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  if (!req.threadIds?.length || !req.action) {
    return { statusCode: 400, body: JSON.stringify({ error: 'threadIds and action required' }) }
  }

  try {
    const { token, updatedSession } = await getValidToken(session)
    await applyAction(token, req)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (updatedSession) headers['Set-Cookie'] = makeSessionCookie(updatedSession)

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, count: req.threadIds.length }) }
  } catch (err) {
    console.error('gmail-batch error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Batch operation failed' }) }
  }
}
