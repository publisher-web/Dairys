const DB_NAME = 'dairys'
const STORE = 'kv'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await withStore('readonly', (s) => s.get(key))) as T | undefined
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await withStore('readwrite', (s) => s.put(value, key))
}

export async function kvDelete(key: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(key))
}

export async function kvKeys(prefix: string): Promise<string[]> {
  const keys = (await withStore('readonly', (s) => s.getAllKeys())) as IDBValidKey[]
  return keys.map(String).filter((k) => k.startsWith(prefix))
}
