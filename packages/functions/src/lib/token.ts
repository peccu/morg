import { refreshAccessToken, InvalidGrantError } from './google-auth.js'

export { InvalidGrantError }

interface Session {
  accessToken: string
  refreshToken: string
  expiresAt: number
  email: string
}

interface TokenResult {
  token: string
  updatedSession: Session | null
}

export async function getValidToken(session: Session): Promise<TokenResult> {
  // 60秒前に先行リフレッシュ
  if (session.expiresAt - 60_000 > Date.now()) {
    return { token: session.accessToken, updatedSession: null }
  }
  const tokens = await refreshAccessToken(session.refreshToken)
  const updatedSession: Session = {
    ...session,
    accessToken: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    // Googleがリフレッシュ時に新しいリフレッシュトークンを返した場合は更新する
    ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
  }
  return { token: tokens.access_token, updatedSession }
}
