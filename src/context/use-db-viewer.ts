import { useContext } from 'react'

import { DbViewerContext } from '@/context/db-viewer-context-object'

export function useDbViewer() {
  const context = useContext(DbViewerContext)

  if (!context) {
    throw new Error('useDbViewer must be used within a DbViewerProvider.')
  }

  return context
}
