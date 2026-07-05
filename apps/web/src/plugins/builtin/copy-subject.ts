import type { Plugin } from '../types'
import { i18n } from '@/i18n'

const t = i18n.global.t

export const copySubjectPlugin: Plugin = {
  id: 'copy-subject',
  get name() { return t('plugins.copySubject.name') },
  get description() { return t('plugins.copySubject.description') },
  defaultEnabled: true,
  threadActions: [
    {
      id: 'copy',
      get label() { return t('plugins.copySubject.actionLabel') },
      run: async ({ thread, app }) => {
        const subject =
          thread.messages[0]?.payload?.headers?.find(
            (h) => h.name.toLowerCase() === 'subject',
          )?.value ?? ''
        await app.copyText(subject)
        app.notify(t('plugins.copySubject.copiedNotify'), 'success')
      },
    },
  ],
}
