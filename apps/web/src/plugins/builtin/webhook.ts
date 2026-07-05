import type { Plugin } from '../types'
import type { GmailMessagePart } from '@morg/shared'
import { i18n } from '@/i18n'

const t = i18n.global.t

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
  get name() { return t('plugins.webhook.name') },
  get description() { return t('plugins.webhook.description') },
  defaultEnabled: false,
  configSchema: {
    endpoint: {
      get label() { return t('plugins.webhook.endpointLabel') },
      type: 'url',
      required: true,
      placeholder: 'https://your-service/ingest',
    },
    apiKey: {
      get label() { return t('plugins.webhook.apiKeyLabel') },
      type: 'password',
      get placeholder() { return t('plugins.webhook.apiKeyPlaceholder') },
    },
  },
  threadActions: [
    {
      id: 'send',
      get label() { return t('plugins.webhook.actionLabel') },
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
        app.notify(t('plugins.webhook.sentNotify'), 'success')
      },
    },
  ],
}
