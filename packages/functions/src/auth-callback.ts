import type { Handler } from '@netlify/functions'
import { google } from 'googleapis'
import { parseCookies, makeSessionCookie } from './lib/cookie.js'
import { createOAuth2Client } from './lib/google-auth.js'

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
    const oauth2 = createOAuth2Client()
    const { tokens } = await oauth2.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens in response')
    }

    oauth2.setCredentials(tokens)
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 })
    const { data: userInfo } = await oauth2Api.userinfo.get()

    const session = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
      email: userInfo.email ?? '',
    }

    return {
      statusCode: 302,
      headers: {
        Location: `${appUrl}/inbox`,
        'Set-Cookie': makeSessionCookie(session),
      },
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
