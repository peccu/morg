import type { Plugin } from '../types'
import { i18n } from '@/i18n'

const t = i18n.global.t

export const openInGmailPlugin: Plugin = {
  id: 'open-in-gmail',
  get name() { return t('plugins.openInGmail.name') },
  get description() { return t('plugins.openInGmail.description') },
  defaultEnabled: true,
  threadActions: [
    {
      id: 'open',
      label: '↗ Gmail',
      run: ({ threadId, app }) => {
        app.openUrl(`https://mail.google.com/mail/u/0/#inbox/${threadId}`)
      },
    },
  ],
}
