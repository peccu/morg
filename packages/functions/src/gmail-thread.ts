import type { Handler } from '@netlify/functions'
import { getSession, makeSessionCookie } from './lib/cookie.js'
import { getValidToken, InvalidGrantError } from './lib/token.js'
import { getThread } from './lib/gmail.js'

export const handler: Handler = async (event) => {
  const session = getSession(event.headers['cookie'] ?? null)
  if (!session) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthenticated' }) }
  }

  const id = event.queryStringParameters?.['id']
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing thread id' }) }
  }

  try {
    const { token, updatedSession } = await getValidToken(session)
    // 本文取得のため full フォーマットで取得
    const thread = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).then((r) => r.json())

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (updatedSession) headers['Set-Cookie'] = makeSessionCookie(updatedSession)

    return { statusCode: 200, headers, body: JSON.stringify(thread) }
  } catch (err) {
    if (err instanceof InvalidGrantError) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Session expired. Please log in again.' }) }
    }
    console.error('gmail-thread error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch thread' }) }
  }
}
