import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const COOKIE_NAME = 'morg_session'

interface Session {
  accessToken: string
  refreshToken: string
  expiresAt: number
  email: string
}

function getSecret(): Buffer {
  const secret = process.env.COOKIE_SECRET
  if (!secret) throw new Error('COOKIE_SECRET is not set')
  return Buffer.from(secret.padEnd(32, '0').slice(0, 32))
}

export function encryptSession(session: Session): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getSecret(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join('.')
}

export function decryptSession(value: string): Session | null {
  try {
    const [ivHex, authTagHex, encryptedHex] = value.split('.')
    const decipher = createDecipheriv(ALGORITHM, getSecret(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ])
    return JSON.parse(decrypted.toString('utf8')) as Session
  } catch {
    return null
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [key, ...vals] = c.trim().split('=')
      return [key, vals.join('=')]
    }),
  )
}

export function getSession(cookieHeader: string | null): Session | null {
  const cookies = parseCookies(cookieHeader)
  const value = cookies[COOKIE_NAME]
  if (!value) return null
  return decryptSession(decodeURIComponent(value))
}

export function makeSessionCookie(session: Session): string {
  const value = encodeURIComponent(encryptSession(session))
  const maxAge = 60 * 60 * 24 * 30  // 30 days
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function makeClearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}
