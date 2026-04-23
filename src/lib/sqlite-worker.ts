/// <reference lib="webworker" />

import type { Database } from 'sql.js'

import {
  createDatabase,
  executeReadOnlySql,
  getDatabaseStructure,
  getFilteredTableRowCount,
  getSqlJs,
  getTableColumns,
  getTablePage,
  listTables,
} from '@/lib/sqlite'
import type {
  WorkerRequest,
  WorkerResponse,
  WorkerResponseMap,
} from '@/lib/sqlite-worker-types'

let database: Database | null = null

function postSuccess<K extends keyof WorkerResponseMap>(
  id: number,
  payload: WorkerResponseMap[K],
) {
  const response: WorkerResponse = {
    id,
    success: true,
    payload,
  }
  self.postMessage(response)
}

function postError(id: number, error: unknown) {
  const response: WorkerResponse = {
    id,
    success: false,
    error: error instanceof Error ? error.message : 'Unexpected SQLite worker error.',
  }
  self.postMessage(response)
}

function requireDatabase() {
  if (!database) {
    throw new Error('Load a SQLite database first.')
  }

  return database
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data

  try {
    switch (request.type) {
      case 'initialize': {
        await getSqlJs()
        postSuccess(request.id, undefined)
        return
      }
      case 'loadDatabase': {
        const { bytes } = request.payload as { bytes: ArrayBuffer }
        const nextDatabase = await createDatabase(new Uint8Array(bytes))
        const tableNames = listTables(nextDatabase)
        database?.close()
        database = nextDatabase
        postSuccess(request.id, { tableNames })
        return
      }
      case 'unloadDatabase': {
        database?.close()
        database = null
        postSuccess(request.id, undefined)
        return
      }
      case 'getDatabaseStructure': {
        postSuccess(request.id, getDatabaseStructure(requireDatabase()))
        return
      }
      case 'getBrowseTableData': {
        const activeDatabase = requireDatabase()
        const { tableName, page, pageSize, globalFilter, sort } =
          request.payload as {
            tableName: string
            page: number
            pageSize: number
            globalFilter?: string
            sort?: {
              column: string
              direction: 'asc' | 'desc'
            } | null
          }

        // PRAGMA table_info is the same for every page of a given table, so
        // resolve the columns once per request and reuse them for both the
        // count and the page query.
        const tableColumns = getTableColumns(activeDatabase, tableName)

        postSuccess(request.id, {
          rowCount: getFilteredTableRowCount(
            activeDatabase,
            tableName,
            tableColumns,
            globalFilter,
          ),
          ...getTablePage(activeDatabase, tableName, tableColumns, {
            page,
            pageSize,
            globalFilter,
            sort,
          }),
        })
        return
      }
      case 'executeReadOnlySql': {
        const { sql } = request.payload as { sql: string }
        postSuccess(
          request.id,
          executeReadOnlySql(requireDatabase(), sql),
        )
        return
      }
      default: {
        const exhaustiveCheck: never = request
        postError(
          (exhaustiveCheck as { id: number }).id,
          new Error(
            `Unknown SQLite worker request type: ${String((exhaustiveCheck as { type: string }).type)}`,
          ),
        )
      }
    }
  } catch (error) {
    postError(request.id, error)
  }
}

export {}
