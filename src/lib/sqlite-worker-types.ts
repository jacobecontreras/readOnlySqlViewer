import type {
  DatabaseStructure,
  SqlExecutionResult,
  SortDirection,
} from '@/lib/sqlite'

export type BrowseTableResult = {
  columns: string[]
  rows: Array<Array<string | number | Uint8Array | null>>
  rowCount: number
}

export type WorkerRequestMap = {
  initialize: undefined
  loadDatabase: {
    bytes: ArrayBuffer
  }
  unloadDatabase: undefined
  getDatabaseStructure: undefined
  getBrowseTableData: {
    tableName: string
    page: number
    pageSize: number
    globalFilter?: string
    sort?: {
      column: string
      direction: SortDirection
    } | null
  }
  executeReadOnlySql: {
    sql: string
  }
}

export type WorkerResponseMap = {
  initialize: undefined
  loadDatabase: {
    tableNames: string[]
  }
  unloadDatabase: undefined
  getDatabaseStructure: DatabaseStructure
  getBrowseTableData: BrowseTableResult
  executeReadOnlySql: SqlExecutionResult
}

// Discriminated unions derived from the request/response maps so that TS can
// exhaustively narrow switch statements and so response payloads stay aligned
// with their request type.
export type WorkerRequest = {
  [K in keyof WorkerRequestMap]: {
    id: number
    type: K
    payload: WorkerRequestMap[K]
  }
}[keyof WorkerRequestMap]

export type WorkerRequestOf<K extends keyof WorkerRequestMap> = Extract<
  WorkerRequest,
  { type: K }
>

type WorkerSuccessResponse = {
  [K in keyof WorkerResponseMap]: {
    id: number
    success: true
    payload: WorkerResponseMap[K]
  }
}[keyof WorkerResponseMap]

type WorkerErrorResponse = {
  id: number
  success: false
  error: string
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse
