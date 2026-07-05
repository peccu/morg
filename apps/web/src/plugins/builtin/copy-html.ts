import type { Plugin } from '../types'
import { extractBody } from '../../lib/mail-body'
import { i18n } from '@/i18n'

const t = i18n.global.t

export const copyHtmlPlugin: Plugin = {
  id: 'copy-html',
  get name() { return t('plugins.copyHtml.name') },
  get description() { return t('plugins.copyHtml.description') },
  defaultEnabled: false,
  threadActions: [
    {
      id: 'copy-html',
      get label() { return t('plugins.copyHtml.actionLabel') },
      run: async ({ thread, app }) => {
        const parts = thread.messages.map((msg) => {
          const { html } = extractBody(msg.payload)
          return html
        })
        await app.copyText(parts.join('\n\n<!-- next message -->\n\n'))
        app.notify(t('plugins.copyHtml.copiedNotify'), 'success')
      },
    },
  ],
}
