import type { Handler } from '@netlify/functions'
import { getSession } from './lib/cookie.js'

export const handler: Handler = async (event, _context) => {
  const session = getSession(event.headers['cookie'] ?? null)

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      session
        ? { authenticated: true, email: session.email }
        : { authenticated: false },
    ),
  }
}
