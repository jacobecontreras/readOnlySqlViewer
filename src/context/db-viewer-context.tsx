import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Database } from 'sql.js'

import {
  DbViewerContext,
  type DbViewerContextValue,
} from '@/context/db-viewer-context-object'
import { createDatabase, getSqlJs, listTables } from '@/lib/sqlite'
import type { DatabaseSummary, DbConnectionStatus } from '@/types/database'

const ALLOWED_EXTENSIONS = new Set(['db', 'sqlite', 'sqlite3'])

function hasSupportedExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension ? ALLOWED_EXTENSIONS.has(extension) : false
}

export function DbViewerProvider({ children }: PropsWithChildren) {
  const [database, setDatabase] = useState<Database | null>(null)
  const [databaseSummary, setDatabaseSummary] = useState<DatabaseSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filePickerRequestKey, setFilePickerRequestKey] = useState(0)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [status, setStatus] = useState<DbConnectionStatus>('initializing')
  const [tableNames, setTableNames] = useState<string[]>([])

  useEffect(() => {
    void getSqlJs()
      .then(() => {
        setStatus('ready')
      })
      .catch(() => {
        setStatus('error')
        setError('Failed to initialize the SQLite runtime.')
      })
  }, [])

  const unloadDatabase = useCallback(() => {
    setDatabase((currentDatabase) => {
      currentDatabase?.close()
      return null
    })
    setDatabaseSummary(null)
    setTableNames([])
    setSelectedTable(null)
    setError(null)
    setStatus('ready')
  }, [])

  useEffect(() => unloadDatabase, [unloadDatabase])

  const loadDatabase = async (file: File) => {
    setError(null)

    if (!hasSupportedExtension(file.name)) {
      setStatus('error')
      setError('Unsupported file type. Use .db, .sqlite, or .sqlite3 files.')
      return
    }

    setStatus('loading')

    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const nextDatabase = await createDatabase(bytes)
      const nextTableNames = listTables(nextDatabase)

      setDatabase((currentDatabase) => {
        currentDatabase?.close()
        return nextDatabase
      })
      setTableNames(nextTableNames)
      setSelectedTable(nextTableNames[0] ?? null)
      setDatabaseSummary({
        fileName: file.name,
        fileSize: file.size,
        tableCount: nextTableNames.length,
      })
      setStatus('loaded')
    } catch {
      setDatabase((currentDatabase) => {
        currentDatabase?.close()
        return null
      })
      setTableNames([])
      setSelectedTable(null)
      setDatabaseSummary(null)
      setStatus('error')
      setError('The selected file could not be opened as a SQLite database.')
    }
  }

  const value = useMemo<DbViewerContextValue>(
    () => ({
      database,
      databaseSummary,
      error,
      filePickerRequestKey,
      status,
      tableNames,
      selectedTable,
      loadDatabase,
      clearError: () => setError(null),
      unloadDatabase,
      setSelectedTable,
      requestFilePicker: () => setFilePickerRequestKey((currentValue) => currentValue + 1),
    }),
    [
      database,
      databaseSummary,
      error,
      filePickerRequestKey,
      selectedTable,
      status,
      tableNames,
      unloadDatabase,
    ],
  )

  return <DbViewerContext.Provider value={value}>{children}</DbViewerContext.Provider>
}
