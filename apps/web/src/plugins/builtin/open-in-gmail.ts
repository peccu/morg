import type { Plugin } from '../types'

export const openInGmailPlugin: Plugin = {
  id: 'open-in-gmail',
  name: 'Gmail で開く',
  description: 'スレッドを Gmail Web UI で直接開きます',
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
