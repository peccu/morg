import type { Plugin } from './types'
import { openInGmailPlugin } from './builtin/open-in-gmail'
import { copySubjectPlugin } from './builtin/copy-subject'

// ここにプラグインを追加する（登録しただけでは動かず、管理画面で有効化が必要）
export const registeredPlugins: Plugin[] = [
  openInGmailPlugin,
  copySubjectPlugin,

  // Webhook 連携の例（コメントアウト）:
  // {
  //   id: 'webhook',
  //   name: 'Webhook 送信',
  //   description: '任意の Webhook URL にスレッド情報を送信します',
  //   configSchema: {
  //     webhookUrl: { label: 'Webhook URL', type: 'url', required: true, placeholder: 'https://...' },
  //   },
  //   threadActions: [{
  //     id: 'send',
  //     label: '送信',
  //     visible: ({ config }) => !!config.webhookUrl,
  //     run: async ({ thread, config, app }) => {
  //       const subject = thread.messages[0]?.payload?.headers
  //         ?.find(h => h.name.toLowerCase() === 'subject')?.value ?? ''
  //       await fetch(config.webhookUrl, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ threadId: thread.id, subject }),
  //       })
  //       app.notify('送信しました', 'success')
  //     },
  //   }],
  // },
]
