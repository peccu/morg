import type { Handler } from '@netlify/functions'
import { randomBytes } from 'crypto'
import { createOAuth2Client, GMAIL_SCOPES } from './lib/google-auth.js'

export const handler: Handler = async (_event, _context) => {
  const state = randomBytes(16).toString('hex')
  const oauth2 = createOAuth2Client()

  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    state,
  })

  return {
    statusCode: 302,
    headers: {
      Location: url,
      'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
    body: '',
  }
}
