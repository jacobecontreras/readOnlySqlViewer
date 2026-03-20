export type DatabaseEngine = 'sqlite'

export type DbConnectionStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'loading'
  | 'loaded'
  | 'error'

export type DatabaseSummary = {
  fileName: string
  fileSize: number
  tableCount: number
}
