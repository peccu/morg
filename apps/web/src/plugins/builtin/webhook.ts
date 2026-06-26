import type { Plugin } from '../types'
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

function extractPlainText(part: GmailMessagePart): string {
  if (part.mimeType === 'text/plain' && part.body.data) return decodeBase64Url(part.body.data)
  if (part.parts) {
    for (const p of part.parts) {
      const t = extractPlainText(p)
      if (t) return t
    }
  }
  return ''
}

function hdr(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export const webhookPlugin: Plugin = {
  id: 'webhook',
  name: 'Webhook 送信',
  description: 'スレッド情報をエンドポイントに JSON で POST します（ingest・タグ付け・ベクトル化などに）',
  defaultEnabled: false,
  configSchema: {
    endpoint: {
      label: '送信先 URL',
      type: 'url',
      required: true,
      placeholder: 'https://your-service/ingest',
    },
    apiKey: {
      label: 'API キー（任意）',
      type: 'password',
      placeholder: 'Bearer トークンとして Authorization ヘッダーに付与',
    },
  },
  threadActions: [
    {
      id: 'send',
      label: '→ 送信',
      visible: ({ config }) => !!config.endpoint,
      async run({ threadId, thread, config, app }) {
        const first = thread.messages[0]
        const firstHdrs = first?.payload?.headers ?? []

        const messages = thread.messages.map((msg) => {
          const hdrs = msg.payload?.headers ?? []
          return {
            id: msg.id,
            subject: hdr(hdrs, 'subject'),
            from: hdr(hdrs, 'from'),
            to: hdr(hdrs, 'to'),
            date: hdr(hdrs, 'date'),
            labels: msg.labelIds ?? [],
            body: msg.payload ? extractPlainText(msg.payload as GmailMessagePart) : '',
            snippet: msg.snippet ?? '',
          }
        })

        const payload = {
          source: 'email',
          threadId,
          subject: hdr(firstHdrs, 'subject'),
          from: hdr(firstHdrs, 'from'),
          date: hdr(firstHdrs, 'date'),
          labels: first?.labelIds ?? [],
          snippet: thread.messages.at(-1)?.snippet ?? '',
          messages,
        }

        const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        if (config.apiKey) reqHeaders['Authorization'] = `Bearer ${config.apiKey}`

        const res = await fetch(config.endpoint, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        app.notify('送信しました', 'success')
      },
    },
  ],
}
