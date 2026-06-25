import type { GmailThread } from '@morg/shared'

export interface Plugin {
  id: string
  name: string
  description?: string
  /** 初回追加時のデフォルト有効状態（省略時 false） */
  defaultEnabled?: boolean
  /** ユーザー設定フィールドの宣言 */
  configSchema?: Record<string, ConfigField>
  /** ThreadView アクションバーに追加するボタン */
  threadActions?: ThreadAction[]
}

export interface ConfigField {
  label: string
  type: 'text' | 'url' | 'password'
  required?: boolean
  placeholder?: string
}

export interface ThreadAction {
  id: string
  label: string
  /** 表示条件（省略時は常に表示） */
  visible?: (ctx: ThreadActionContext) => boolean
  run: (ctx: ThreadActionContext) => void | Promise<void>
}

export interface ThreadActionContext {
  threadId: string
  thread: GmailThread
  /** このプラグインの保存済み設定 */
  config: Record<string, string>
  app: AppAPI
}

export interface AppAPI {
  notify(message: string, type?: 'success' | 'error' | 'info'): void
  back(): void
  openUrl(url: string): void
  copyText(text: string): Promise<void>
  gmail: {
    archive(threadIds: string[]): Promise<void>
    trash(threadIds: string[]): Promise<void>
    markRead(threadIds: string[]): Promise<void>
    addLabel(threadIds: string[], labelId: string): Promise<void>
  }
}
