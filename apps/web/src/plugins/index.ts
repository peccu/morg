import type { Plugin } from './types'
import { openInGmailPlugin } from './builtin/open-in-gmail'
import { copySubjectPlugin } from './builtin/copy-subject'
import { webhookPlugin } from './builtin/webhook'
import { copyHtmlPlugin } from './builtin/copy-html'

export const registeredPlugins: Plugin[] = [
  openInGmailPlugin,
  copySubjectPlugin,
  webhookPlugin,
  copyHtmlPlugin,
]
