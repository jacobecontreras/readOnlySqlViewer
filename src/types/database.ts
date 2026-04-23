export type DbConnectionStatus =
  | 'initializing'
  | 'ready'
  | 'loading'
  | 'loaded'
  | 'error'

export type DatabaseSummary = {
  fileName: string
}
