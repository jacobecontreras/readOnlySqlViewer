import SqliteWorker from '@/lib/sqlite-worker?worker'
import type {
  WorkerRequestMap,
  WorkerRequestOf,
  WorkerResponse,
  WorkerResponseMap,
} from '@/lib/sqlite-worker-types'

// Per-operation timeouts. Large SQLite files and a cold wasm fetch comfortably
// exceed the default query timeout on slower machines, so the expensive
// one-shot calls get generous budgets and per-row operations get the short
// default.
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000
const REQUEST_TIMEOUT_BY_TYPE: Partial<Record<keyof WorkerRequestMap, number>> = {
  initialize: 60_000,
  loadDatabase: 5 * 60_000,
  getDatabaseStructure: 60_000,
}

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  timeoutId: ReturnType<typeof setTimeout>
}

type CrashListener = (error: Error) => void

class SqliteClient {
  private worker: Worker | null = null

  private nextRequestId = 1

  private pendingRequests = new Map<number, PendingRequest>()

  private crashListeners = new Set<CrashListener>()

  // Subscribe to worker crashes (uncaught error or undecodable message). On
  // crash the worker is torn down so the next request lazily spins up a fresh,
  // empty one — listeners are expected to clear UI state and ask the user to
  // reload their database file.
  onCrash(listener: CrashListener) {
    this.crashListeners.add(listener)
    return () => {
      this.crashListeners.delete(listener)
    }
  }

  private handleCrash(error: Error) {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.failAllPending(error)
    for (const listener of this.crashListeners) {
      listener(error)
    }
  }

  private getWorker() {
    if (!this.worker) {
      const worker = new SqliteWorker()

      worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
        const response = event.data
        const pendingRequest = this.pendingRequests.get(response.id)
        if (!pendingRequest) {
          return
        }

        clearTimeout(pendingRequest.timeoutId)
        this.pendingRequests.delete(response.id)

        if (response.success) {
          pendingRequest.resolve(response.payload)
          return
        }

        pendingRequest.reject(new Error(response.error))
      })

      worker.addEventListener('error', (event) => {
        this.handleCrash(
          new Error(event.message || 'SQLite worker crashed unexpectedly.'),
        )
      })

      worker.addEventListener('messageerror', () => {
        this.handleCrash(
          new Error('SQLite worker sent a message that could not be deserialized.'),
        )
      })

      this.worker = worker
    }

    return this.worker
  }

  private failAllPending(error: Error) {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeoutId)
      pending.reject(error)
    }
    this.pendingRequests.clear()
  }

  private request<K extends keyof WorkerRequestMap>(
    type: K,
    payload: WorkerRequestMap[K],
    transfer: Transferable[] = [],
  ) {
    const id = this.nextRequestId
    this.nextRequestId += 1
    const timeoutMs = REQUEST_TIMEOUT_BY_TYPE[type] ?? DEFAULT_REQUEST_TIMEOUT_MS

    return new Promise<WorkerResponseMap[K]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(
          new Error(
            `Database operation "${type}" timed out after ${Math.round(timeoutMs / 1000)}s.`,
          ),
        )
      }, timeoutMs)

      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as WorkerResponseMap[K]),
        reject,
        timeoutId,
      })

      const message = {
        id,
        type,
        payload,
      } as WorkerRequestOf<K>

      this.getWorker().postMessage(message, transfer)
    })
  }

  initialize() {
    return this.request('initialize', undefined)
  }

  loadDatabase(bytes: ArrayBuffer) {
    return this.request('loadDatabase', { bytes }, [bytes])
  }

  unloadDatabase() {
    return this.request('unloadDatabase', undefined)
  }

  getDatabaseStructure() {
    return this.request('getDatabaseStructure', undefined)
  }

  getBrowseTableData(payload: WorkerRequestMap['getBrowseTableData']) {
    return this.request('getBrowseTableData', payload)
  }

  executeReadOnlySql(sql: string) {
    return this.request('executeReadOnlySql', { sql })
  }
}

export const sqliteClient = new SqliteClient()
