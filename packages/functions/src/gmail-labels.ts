import type { Handler } from '@netlify/functions'
import { getSession, makeSessionCookie } from './lib/cookie.js'
import { getValidToken, InvalidGrantError } from './lib/token.js'

export const handler: Handler = async (event) => {
  const session = getSession(event.headers['cookie'] ?? null)
  if (!session) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthenticated' }) }
  }

  try {
    const { token, updatedSession } = await getValidToken(session)
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Gmail API ${res.status}: ${text}`)
    }
    const data = await res.json() as { labels: unknown[] }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (updatedSession) headers['Set-Cookie'] = makeSessionCookie(updatedSession)

    return { statusCode: 200, headers, body: JSON.stringify(data) }
  } catch (err) {
    if (err instanceof InvalidGrantError) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Session expired. Please log in again.' }) }
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('gmail-labels error:', message)
    return { statusCode: 500, body: JSON.stringify({ error: message }) }
  }
}
