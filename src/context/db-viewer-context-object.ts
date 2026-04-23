import { createContext } from 'react'

import type { DatabaseSummary, DbConnectionStatus } from '@/types/database'

export type DbViewerContextValue = {
  databaseRevision: number
  hasDatabase: boolean
  databaseSummary: DatabaseSummary | null
  error: string | null
  status: DbConnectionStatus
  tableNames: string[]
  selectedTable: string | null
  filePickerRequestKey: number
  loadDatabase: (file: File) => Promise<void>
  clearError: () => void
  unloadDatabase: () => Promise<void>
  setSelectedTable: (tableName: string) => void
  requestFilePicker: () => void
}

export const DbViewerContext = createContext<DbViewerContextValue | null>(null)
