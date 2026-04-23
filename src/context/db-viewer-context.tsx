import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

import {
  DbViewerContext,
  type DbViewerContextValue,
} from '@/context/db-viewer-context-object'
import { sqliteClient } from '@/lib/sqlite-client'
import type { DatabaseSummary, DbConnectionStatus } from '@/types/database'

const MAX_DATABASE_SIZE_BYTES = 500 * 1024 * 1024 // 500MB

export function DbViewerProvider({ children }: PropsWithChildren) {
  const [databaseSummary, setDatabaseSummary] = useState<DatabaseSummary | null>(null)
  const [databaseRevision, setDatabaseRevision] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [filePickerRequestKey, setFilePickerRequestKey] = useState(0)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [status, setStatus] = useState<DbConnectionStatus>('initializing')
  const [tableNames, setTableNames] = useState<string[]>([])
  // Monotonically increasing token used to ignore stale results from
  // overlapping load/unload calls. Only the most recent request is allowed to
  // commit state; everything else is dropped silently.
  const databaseRequestIdRef = useRef(0)

  useEffect(() => {
    void sqliteClient
      .initialize()
      .then(() => {
        setStatus('ready')
      })
      .catch(() => {
        setStatus('error')
        setError('Failed to initialize the SQLite runtime.')
      })
  }, [])

  useEffect(() => {
    return sqliteClient.onCrash(() => {
      // The crashed worker has already been terminated; the next request will
      // lazily spawn a replacement that has no database loaded. Bumping the
      // request id invalidates any in-flight load/unload so they can't commit
      // stale state on top of the recovery message.
      databaseRequestIdRef.current += 1
      setDatabaseSummary(null)
      setTableNames([])
      setSelectedTable(null)
      setStatus('error')
      setError(
        'The SQLite worker crashed unexpectedly. Please reload your database file to continue.',
      )
      setDatabaseRevision((currentValue) => currentValue + 1)
    })
  }, [])

  const unloadDatabase = useCallback(async () => {
    const requestId = ++databaseRequestIdRef.current
    await sqliteClient.unloadDatabase()
    if (databaseRequestIdRef.current !== requestId) {
      return
    }
    setDatabaseSummary(null)
    setTableNames([])
    setSelectedTable(null)
    setError(null)
    setStatus('ready')
    setDatabaseRevision((currentValue) => currentValue + 1)
  }, [])

  const loadDatabase = useCallback(async (file: File) => {
    const requestId = ++databaseRequestIdRef.current
    setError(null)
    setStatus('loading')

    if (file.size > MAX_DATABASE_SIZE_BYTES) {
      if (databaseRequestIdRef.current !== requestId) {
        return
      }
      setStatus('error')
      setError(
        `Database file is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 500 MB.`,
      )
      return
    }

    try {
      const bytes = await file.arrayBuffer()
      if (databaseRequestIdRef.current !== requestId) {
        return
      }
      const result = await sqliteClient.loadDatabase(bytes)
      if (databaseRequestIdRef.current !== requestId) {
        return
      }
      setTableNames(result.tableNames)
      setSelectedTable(result.tableNames[0] ?? null)
      setDatabaseSummary({ fileName: file.name })
      setStatus('loaded')
      setDatabaseRevision((currentValue) => currentValue + 1)
    } catch (loadError) {
      // Only clean up the worker-side database if this is still the active
      // load; a newer load has its own DB to manage and we mustn't close it.
      if (databaseRequestIdRef.current !== requestId) {
        return
      }
      await sqliteClient.unloadDatabase().catch(() => {
        // Swallow cleanup failures; we're already handling the primary error.
      })
      if (databaseRequestIdRef.current !== requestId) {
        return
      }
      setTableNames([])
      setSelectedTable(null)
      setDatabaseSummary(null)
      setStatus('error')
      const message =
        loadError instanceof Error && loadError.message
          ? loadError.message
          : 'Unknown error.'
      setError(`Could not open the file as a SQLite database: ${message}`)
      setDatabaseRevision((currentValue) => currentValue + 1)
    }
  }, [])

  const value = useMemo<DbViewerContextValue>(
    () => ({
      databaseRevision,
      hasDatabase: Boolean(databaseSummary),
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
      databaseRevision,
      databaseSummary,
      error,
      filePickerRequestKey,
      loadDatabase,
      selectedTable,
      status,
      tableNames,
      unloadDatabase,
    ],
  )

  return <DbViewerContext.Provider value={value}>{children}</DbViewerContext.Provider>
}
