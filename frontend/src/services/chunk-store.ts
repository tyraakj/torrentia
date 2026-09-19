/**
 * In-browser chunk storage using native IndexedDB.
 * Allows uploaded and downloaded model chunks to persist across page refreshes
 * so peers can serve chunks to the swarm.
 */

const DB_NAME = 'torrentia_chunks_db'
const DB_VERSION = 2
const STORE_NAME = 'chunks'

interface StoredChunk {
  key: string // `${modelId}:${walletKey}:${index}`
  modelId: string
  walletKey: string
  index: number
  data: ArrayBuffer
  storedAt: number
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('modelId', 'modelId', { unique: false })
      }
      const store = (event.target as IDBOpenDBRequest).transaction?.objectStore(STORE_NAME)
      if (store && !store.indexNames.contains('walletModel')) {
        store.createIndex('walletModel', ['walletKey', 'modelId'], { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Stores a chunk in IndexedDB.
 */
export async function storeChunk(
  modelId: string,
  index: number,
  data: ArrayBuffer,
  walletAddress?: string
): Promise<void> {
  const db = await getDB()
  const walletKey = (walletAddress || 'anonymous').toLowerCase()
  const key = `${modelId}:${walletKey}:${index}`

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const record: StoredChunk = {
      key,
      modelId,
      walletKey,
      index,
      data,
      storedAt: Date.now(),
    }

    const request = store.put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieves a single chunk by modelId and chunk index.
 */
export async function getChunk(
  modelId: string,
  index: number,
  walletAddress?: string
): Promise<ArrayBuffer | null> {
  const db = await getDB()
  const walletKey = (walletAddress || 'anonymous').toLowerCase()
  const key = `${modelId}:${walletKey}:${index}`

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.get(key)
    request.onsuccess = () => {
      const result = request.result as StoredChunk | undefined
      resolve(result ? result.data : null)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Returns an array of chunk indices currently held in storage for a given modelId.
 */
export async function getHeldChunks(modelId: string, walletAddress?: string): Promise<number[]> {
  const db = await getDB()
  const walletKey = (walletAddress || 'anonymous').toLowerCase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('walletModel')

    const request = index.getAll([walletKey, modelId])
    request.onsuccess = () => {
      const records = request.result as StoredChunk[]
      const indices = records.map((r) => r.index).sort((a, b) => a - b)
      resolve(indices)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieves all chunks for a model in sequential order (0 to chunkCount - 1).
 * Rejects if any chunk is missing.
 */
export async function getAllChunks(
  modelId: string,
  chunkCount: number,
  walletAddress?: string
): Promise<ArrayBuffer[]> {
  const chunks: ArrayBuffer[] = []

  for (let i = 0; i < chunkCount; i++) {
    const chunk = await getChunk(modelId, i, walletAddress)
    if (!chunk) {
      throw new Error(`Missing chunk index ${i} for model ${modelId}`)
    }
    chunks.push(chunk)
  }

  return chunks
}

/**
 * Deletes all stored chunks for a model from IndexedDB.
 */
export async function deleteModel(modelId: string, walletAddress?: string): Promise<void> {
  const db = await getDB()
  const walletKey = (walletAddress || 'anonymous').toLowerCase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('walletModel')

    const request = index.getAllKeys([walletKey, modelId])
    request.onsuccess = () => {
      const keys = request.result
      for (const key of keys) {
        store.delete(key)
      }
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}
