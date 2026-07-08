import type { ThreadListItem, BatchAction } from '@morg/shared'

const DB_NAME = 'morg-thread-cache'
const DB_VERSION = 1
const STORE = 'queries'

export interface QueryCacheEntry {
  query: string
  threads: ThreadListItem[]
  nextPageToken?: string
  fetchedAt: number
}

let _db: IDBDatabase | null = null

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'query' })
      }
    }
    req.onsuccess = (e) => { _db = (e.target as IDBOpenDBRequest).result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

function txRequest<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

export function getQueryCache(query: string): Promise<QueryCacheEntry | null> {
  return txRequest('readonly', s => s.get(query)).then(r => (r as QueryCacheEntry | undefined) ?? null)
}

export function setQueryCache(query: string, threads: ThreadListItem[], nextPageToken?: string): Promise<void> {
  return txRequest('readwrite', s => s.put({ query, threads, nextPageToken, fetchedAt: Date.now() }))
    .then(() => undefined)
}

export async function applyActionToDb(threadIds: string[], action: BatchAction, labelId?: string): Promise<void> {
  const db = await openDb()
  const entries: QueryCacheEntry[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as QueryCacheEntry[])
    req.onerror = () => reject(req.error)
  })
  const idSet = new Set(threadIds)
  const updated = entries.map(e => ({ ...e, threads: applyActionToList(e.threads, idSet, action, labelId) }))
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const e of updated) store.put(e)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getDbStats(): Promise<{ query: string; count: number; fetchedAt: number }[]> {
  const entries: QueryCacheEntry[] = await txRequest('readonly', s => s.getAll()) as QueryCacheEntry[]
  return entries
    .map(e => ({ query: e.query, count: e.threads.length, fetchedAt: e.fetchedAt }))
    .sort((a, b) => b.fetchedAt - a.fetchedAt)
}

export function clearQueryCache(query: string): Promise<void> {
  return txRequest('readwrite', s => s.delete(query)).then(() => undefined)
}

export async function clearAllDbCache(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Shared thread-list mutation logic (used by both DB and in-memory updates)
export function applyActionToList(
  threads: ThreadListItem[],
  idSet: Set<string>,
  action: BatchAction,
  labelId?: string,
): ThreadListItem[] {
  switch (action) {
    case 'trash':
    case 'archive':
      return threads.filter(t => !idSet.has(t.threadId))
    case 'markRead':
      return threads.map(t =>
        idSet.has(t.threadId)
          ? { ...t, unread: false, labelIds: t.labelIds.filter(l => l !== 'UNREAD') }
          : t,
      )
    case 'markUnread':
      return threads.map(t =>
        idSet.has(t.threadId)
          ? { ...t, unread: true, labelIds: t.labelIds.includes('UNREAD') ? t.labelIds : [...t.labelIds, 'UNREAD'] }
          : t,
      )
    case 'addLabel':
      if (!labelId) return threads
      return threads.map(t =>
        idSet.has(t.threadId)
          ? { ...t, labelIds: t.labelIds.includes(labelId) ? t.labelIds : [...t.labelIds, labelId] }
          : t,
      )
    case 'removeLabel':
      if (!labelId) return threads
      return threads.map(t =>
        idSet.has(t.threadId)
          ? { ...t, labelIds: t.labelIds.filter(l => l !== labelId) }
          : t,
      )
    default: {
      const _: never = action
      return threads
    }
  }
}
