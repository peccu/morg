import DOMPurify from 'dompurify'
import type { GmailMessagePart } from '@morg/shared'

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// テキストメール向け: URLをクリッカブルなリンクに変換しつつ残りをHTMLエスケープ
function linkify(text: string): string {
  const urlRegex = /https?:\/\/[^\s<>"[\]{}|\\^`]+/g
  const parts: string[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(text)) !== null) {
    parts.push(escapeHtml(text.slice(last, match.index)))
    const url = match[0]
    const safeUrl = escapeHtml(url).replace(/"/g, '&quot;')
    parts.push(`<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all">${safeUrl}</a>`)
    last = match.index + url.length
  }
  parts.push(escapeHtml(text.slice(last)))
  return parts.join('')
}

function extractPart(part: GmailMessagePart, mimeType: string): string | null {
  if (part.mimeType === mimeType && part.body.data) {
    return decodeBase64Url(part.body.data)
  }
  if (part.parts) {
    for (const p of part.parts) {
      const result = extractPart(p, mimeType)
      if (result) return result
    }
  }
  return null
}

export function extractBody(payload: GmailMessagePart): { html: string; isHtml: boolean } {
  const html = extractPart(payload, 'text/html')
  if (html) {
    return { html: DOMPurify.sanitize(html), isHtml: true }
  }
  const plain = extractPart(payload, 'text/plain')
  if (plain) {
    return { html: linkify(plain).replace(/\n/g, '<br>'), isHtml: false }
  }
  return { html: '', isHtml: false }
}
