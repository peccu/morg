import type { Handler } from '@netlify/functions'
import { makeClearCookie } from './lib/cookie.js'

export const handler: Handler = async (_event, _context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': makeClearCookie(),
    },
    body: JSON.stringify({ ok: true }),
  }
}
