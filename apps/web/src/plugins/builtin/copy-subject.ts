import type { Plugin } from '../types'

export const copySubjectPlugin: Plugin = {
  id: 'copy-subject',
  name: '件名をコピー',
  description: 'スレッドの件名をクリップボードにコピーします',
  defaultEnabled: true,
  threadActions: [
    {
      id: 'copy',
      label: '件名コピー',
      run: async ({ thread, app }) => {
        const subject =
          thread.messages[0]?.payload?.headers?.find(
            (h) => h.name.toLowerCase() === 'subject',
          )?.value ?? ''
        await app.copyText(subject)
        app.notify('件名をコピーしました', 'success')
      },
    },
  ],
}
