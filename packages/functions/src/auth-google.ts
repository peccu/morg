import type { Handler } from '@netlify/functions'
import { randomBytes } from 'crypto'
import { buildAuthUrl } from './lib/google-auth.js'

export const handler: Handler = async (_event, _context) => {
  const state = randomBytes(16).toString('hex')
  const url = buildAuthUrl(state)

  return {
    statusCode: 302,
    headers: {
      Location: url,
      'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
    body: '',
  }
}
