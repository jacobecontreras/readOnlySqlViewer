import { createContext } from 'react'
import type { Database } from 'sql.js'

import type { DatabaseSummary, DbConnectionStatus } from '@/types/database'

export type DbViewerContextValue = {
  database: Database | null
  databaseSummary: DatabaseSummary | null
  error: string | null
  status: DbConnectionStatus
  tableNames: string[]
  selectedTable: string | null
  filePickerRequestKey: number
  loadDatabase: (file: File) => Promise<void>
  clearError: () => void
  unloadDatabase: () => void
  setSelectedTable: (tableName: string) => void
  requestFilePicker: () => void
}

export const DbViewerContext = createContext<DbViewerContextValue | null>(null)
