import type { Handler } from '@netlify/functions'
import { randomBytes } from 'node:crypto'
import { buildAuthUrl } from './lib/google-auth.js'

export const handler: Handler = async (_event, _context) => {
  // 環境変数チェック
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    console.error('Missing env vars:', {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
    })
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' } as Record<string, string>,
      body: `<!DOCTYPE html><html><body>
        <h2>設定エラー</h2>
        <p>Netlify の環境変数 <code>GOOGLE_CLIENT_ID</code> または <code>GOOGLE_REDIRECT_URI</code> が設定されていません。</p>
        <p><a href="/">トップに戻る</a></p>
      </body></html>`,
    }
  }

  try {
    const state = randomBytes(16).toString('hex')
    const url = buildAuthUrl(state)

    return {
      statusCode: 302,
      headers: {
        Location: url,
        'Cache-Control': 'no-store',
        'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      },
      // meta refresh をフォールバックとして含める（ブラウザが 302 を無視した場合）
      body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${url}"></head>
        <body><p>Googleへ転送中... <a href="${url}">こちらをクリック</a></p></body></html>`,
    }
  } catch (err) {
    console.error('auth-google error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' } as Record<string, string>,
      body: `<!DOCTYPE html><html><body>
        <h2>認証エラー</h2>
        <pre>${String(err)}</pre>
        <p><a href="/">トップに戻る</a></p>
      </body></html>`,
    }
  }
}
