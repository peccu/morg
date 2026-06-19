import type { Handler } from '@netlify/functions'
import { parseCookies, makeSessionCookie } from './lib/cookie.js'
import { exchangeCodeForTokens, getUserEmail } from './lib/google-auth.js'

export const handler: Handler = async (event, _context) => {
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173'
  const params = event.queryStringParameters ?? {}
  const code = params['code']
  const state = params['state']

  const cookies = parseCookies(event.headers['cookie'] ?? null)
  const savedState = cookies['oauth_state']

  if (!code || !state || state !== savedState) {
    return {
      statusCode: 302,
      headers: { Location: `${appUrl}/login?error=invalid_state` } as Record<string, string>,
      body: '',
    }
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.refresh_token) {
      throw new Error('No refresh_token returned — was prompt=consent set?')
    }

    const email = await getUserEmail(tokens.access_token)
    const session = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      email,
    }

    return {
      statusCode: 302,
      headers: {
        Location: `${appUrl}/login-success`,
        'Set-Cookie': makeSessionCookie(session),
      } as Record<string, string>,
      body: '',
    }
  } catch (err) {
    console.error('auth-callback error:', err)
    return {
      statusCode: 302,
      headers: { Location: `${appUrl}/login?error=auth_failed` } as Record<string, string>,
      body: '',
    }
  }
}
