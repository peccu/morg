// Gmail API response types

export interface GmailLabel {
  id: string
  name: string
  type: 'system' | 'user'
  messagesTotal?: number
  messagesUnread?: number
  threadsTotal?: number
  threadsUnread?: number
}

export interface GmailMessageHeader {
  name: string
  value: string
}

export interface GmailMessagePart {
  partId: string
  mimeType: string
  filename?: string
  headers: GmailMessageHeader[]
  body: {
    size: number
    data?: string
    attachmentId?: string
  }
  parts?: GmailMessagePart[]
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: GmailMessagePart
  sizeEstimate: number
  historyId: string
  internalDate: string
}

export interface GmailThread {
  id: string
  historyId: string
  messages: GmailMessage[]
  snippet: string
}

export interface ThreadListItem {
  id: string
  threadId: string
  snippet: string
  subject: string
  from: string
  date: string
  labelIds: string[]
  unread: boolean
}

export interface ThreadListResponse {
  threads: ThreadListItem[]
  nextPageToken?: string
  resultSizeEstimate: number
}

// Batch operation types

export type BatchAction = 'archive' | 'trash' | 'markRead' | 'markUnread' | 'addLabel' | 'removeLabel'

export interface BatchOperationRequest {
  threadIds: string[]
  action: BatchAction
  labelId?: string
}

// Auth types

export interface AuthStatus {
  authenticated: boolean
  email?: string
}
