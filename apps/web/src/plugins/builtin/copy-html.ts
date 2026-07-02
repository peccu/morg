import type { Plugin } from '../types'
import { extractBody } from '../../lib/mail-body'

export const copyHtmlPlugin: Plugin = {
  id: 'copy-html',
  name: 'HTML コピー (debug)',
  description: 'メール本文の生HTMLをクリップボードにコピーします（デバッグ用）',
  defaultEnabled: false,
  threadActions: [
    {
      id: 'copy-html',
      label: 'HTML コピー',
      run: async ({ thread, app }) => {
        const parts = thread.messages.map((msg) => {
          const { html } = extractBody(msg.payload)
          return html
        })
        await app.copyText(parts.join('\n\n<!-- next message -->\n\n'))
        app.notify('HTMLをコピーしました', 'success')
      },
    },
  ],
}
