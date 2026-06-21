import type { Handler } from '@netlify/functions'
import { getSession, makeSessionCookie } from './lib/cookie.js'
import { getValidToken } from './lib/token.js'
import { listThreadsWithMetadata } from './lib/gmail.js'

export const handler: Handler = async (event) => {
  const session = getSession(event.headers['cookie'] ?? null)
  if (!session) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthenticated' }) }
  }

  const params = event.queryStringParameters ?? {}
  const q = params['q'] ?? 'in:inbox'
  const pageToken = params['pageToken'] ?? undefined
  const maxResults = Math.min(Number(params['maxResults'] ?? 20), 500)

  try {
    const { token, updatedSession } = await getValidToken(session)
    const data = await listThreadsWithMetadata(token, q, pageToken, maxResults)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (updatedSession) headers['Set-Cookie'] = makeSessionCookie(updatedSession)

    return { statusCode: 200, headers, body: JSON.stringify(data) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('gmail-threads error:', message)
    return { statusCode: 500, body: JSON.stringify({ error: message }) }
  }
}
