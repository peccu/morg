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

// ── メールの <style> スコープ化 ──────────────────────────────────────
// メール内 <style> のセレクタ全てに scopeClass を付与して
// アプリ UI への CSS 汚染（白文字等）を防ぐ。
// またメール CSS の !important を除去することで、
// こちらの max-width / min-width !important が確実に勝てるようにする。

function findMatchingBrace(css: string, start: number): number {
  let depth = 0
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return i
  }
  return -1
}

function scopeSelectors(selectorText: string, scope: string): string {
  return selectorText
    .split(',')
    .map(s => {
      s = s.trim()
      if (!s) return ''
      // body / html / :root → スコープ要素そのもの
      if (s === 'html' || s === 'body' || s === ':root') return scope
      if (s === '*') return `${scope} *`
      // "body .foo" / "html .foo" → scope + " .foo"
      const replaced = s.replace(/^(html|body)\s+/, `${scope} `)
      if (replaced !== s) return replaced
      // その他は全て scope を前置する（メール独自の .mail-body クラスも含む）
      return `${scope} ${s}`
    })
    .filter(Boolean)
    .join(', ')
}

function scopeEmailCss(css: string, scope: string): string {
  css = css
    .replace(/\/\*[\s\S]*?\*\//g, '')   // コメント除去
    .replace(/@import[^;]*;/gi, '')     // @import 除去
    .replace(/!important/gi, '')        // メールの !important を除去（自アプリの !important を優先させるため）

  let result = ''
  let i = 0

  while (i < css.length) {
    const openIdx = css.indexOf('{', i)
    if (openIdx === -1) break

    const selectorPart = css.slice(i, openIdx).trim()
    if (!selectorPart) { i = openIdx + 1; continue }

    const closeIdx = findMatchingBrace(css, openIdx)
    if (closeIdx === -1) break

    const blockContent = css.slice(openIdx + 1, closeIdx)

    if (selectorPart.startsWith('@media') || selectorPart.startsWith('@supports')) {
      // @media / @supports: 中身を再帰的にスコープ化
      result += `${selectorPart}{${scopeEmailCss(blockContent, scope)}}`
    } else if (selectorPart.startsWith('@')) {
      // @keyframes / @font-face 等: そのまま通す
      result += `${selectorPart}{${blockContent}}`
    } else {
      result += `${scopeSelectors(selectorPart, scope)}{${blockContent}}`
    }

    i = closeIdx + 1
  }

  return result
}

function scopeStyleTags(html: string, scope: string): string {
  return html.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_, attrs, css) => `<style${attrs}>${scopeEmailCss(css, scope)}</style>`,
  )
}

// ─────────────────────────────────────────────────────────────────────

export function extractBody(payload: GmailMessagePart): { html: string; isHtml: boolean } {
  const rawHtml = extractPart(payload, 'text/html')
  if (rawHtml) {
    const sanitized = DOMPurify.sanitize(rawHtml)
    return { html: scopeStyleTags(sanitized, '.mail-body'), isHtml: true }
  }
  const plain = extractPart(payload, 'text/plain')
  if (plain) {
    return { html: linkify(plain).replace(/\n/g, '<br>'), isHtml: false }
  }
  return { html: '', isHtml: false }
}
