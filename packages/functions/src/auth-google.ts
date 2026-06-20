import type { Handler } from '@netlify/functions'
import { randomBytes } from 'node:crypto'
import { buildAuthUrl } from './lib/google-auth.js'

export const handler: Handler = async (_event, _context) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    console.error('Missing env vars: GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' } as Record<string, string>,
      body: JSON.stringify({ error: '環境変数 GOOGLE_CLIENT_ID または GOOGLE_REDIRECT_URI が未設定です' }),
    }
  }

  try {
    const state = randomBytes(16).toString('hex')
    const url = buildAuthUrl(state)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      },
      body: JSON.stringify({ url }),
    }
  } catch (err) {
    console.error('auth-google error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' } as Record<string, string>,
      body: JSON.stringify({ error: String(err) }),
    }
  }
}
