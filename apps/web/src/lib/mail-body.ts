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
    const escaped = plain
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
    return { html: escaped, isHtml: false }
  }
  return { html: '', isHtml: false }
}
