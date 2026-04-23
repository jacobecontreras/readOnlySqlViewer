import { PencilLine, Play, PlusSquare, X } from 'lucide-react'
import { useState } from 'react'

import { DataTable } from '@/components/database/data-table'
import { Button } from '@/components/ui/button'
import { useDbViewer } from '@/context/use-db-viewer'
import { sqliteClient } from '@/lib/sqlite-client'

const DEFAULT_QUERY = `SELECT name
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;`

// `crypto.randomUUID` is only available in secure contexts (HTTPS / localhost).
// Fall back to a process-local counter + random suffix so the tool still works
// over plain HTTP during local network testing; uniqueness only has to hold
// within a single session.
let fallbackTabCounter = 0
function createTabId() {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  fallbackTabCounter += 1
  return `tab-${fallbackTabCounter}-${Math.random().toString(36).slice(2, 10)}`
}

type SqlResultTab = {
  id: string
  name: string
  sql: string
  columns: string[]
  rows: Array<Array<string | number | Uint8Array | null>>
  durationMs: number
  rowCount: number
}

export function ExecuteSqlPanel() {
  const { hasDatabase } = useDbViewer()
  const [sql, setSql] = useState(DEFAULT_QUERY)
  const [error, setError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [activeResultId, setActiveResultId] = useState<string | null>(null)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [resultTabs, setResultTabs] = useState<SqlResultTab[]>([])

  const activeResult =
    resultTabs.find((resultTab) => resultTab.id === activeResultId) ?? resultTabs[0] ?? null

  const runQuery = async () => {
    if (!hasDatabase) {
      setError('Load a database before executing SQL.')
      return
    }

    setIsExecuting(true)

    try {
      const execution = await sqliteClient.executeReadOnlySql(sql)
      const nextResultTab: SqlResultTab = {
        id: createTabId(),
        name: `Query ${resultTabs.length + 1}`,
        sql,
        ...execution,
      }

      setResultTabs((currentTabs) => [...currentTabs, nextResultTab])
      setActiveResultId(nextResultTab.id)
      setEditingTabId(null)
      setError(null)
    } catch (queryError) {
      setError(
        queryError instanceof Error ? queryError.message : 'Query execution failed.',
      )
    } finally {
      setIsExecuting(false)
    }
  }

  const startNewQuery = () => {
    setSql(DEFAULT_QUERY)
    setError(null)
  }

  const finishRenamingTab = (tabId: string) => {
    // Trim and fall back to a stable default so tab labels can never become
    // empty/whitespace-only after a rename.
    setResultTabs((currentTabs) =>
      currentTabs.map((tab) => {
        if (tab.id !== tabId) {
          return tab
        }
        const trimmed = tab.name.trim()
        if (trimmed) {
          return { ...tab, name: trimmed }
        }
        const fallbackIndex = currentTabs.findIndex((candidate) => candidate.id === tabId)
        return { ...tab, name: `Query ${fallbackIndex + 1}` }
      }),
    )
    setEditingTabId(null)
  }

  const closeResultTab = (tabId: string) => {
    setResultTabs((currentTabs) => {
      const nextTabs = currentTabs.filter((resultTab) => resultTab.id !== tabId)

      if (activeResultId === tabId) {
        setActiveResultId(nextTabs.at(-1)?.id ?? null)
      }

      if (editingTabId === tabId) {
        setEditingTabId(null)
      }

      return nextTabs
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {error || isExecuting ? (
        <div className="flex flex-col gap-3 pb-3">
          {error ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground"
            >
              {error}
            </div>
          ) : null}

          {isExecuting ? (
            <div
              role="status"
              aria-live="polite"
              aria-label="Executing query"
              className="overflow-hidden rounded-full border border-border bg-panel"
            >
              <div className="h-1.5 w-1/3 animate-pulse rounded-full bg-[#7a7a7a]" />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(320px,0.42fr)_minmax(0,0.58fr)]">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-panel">
          <div className="flex h-10 items-center gap-2 border-b border-border px-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            SQL Editor
          </div>
          <textarea
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
                event.preventDefault()
                startNewQuery()
                return
              }

              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault()
                void runQuery()
              }
            }}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-transparent px-3 py-3 font-mono text-xs leading-5 text-foreground outline-none"
            placeholder="SELECT * FROM your_table LIMIT 100;"
          />
          <div className="flex h-[52px] items-center justify-between gap-3 border-t border-border px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Cmd/Ctrl + Enter executes
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={startNewQuery}>
                <PlusSquare className="h-4 w-4" />
                New Query
              </Button>
              <Button size="sm" onClick={() => void runQuery()} disabled={!hasDatabase || isExecuting}>
                <Play className="h-4 w-4" />
                {isExecuting ? 'Running...' : 'Execute'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-panel">
          <div className="flex h-10 items-center justify-between gap-3 border-b border-border px-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <div className="inline-flex min-w-0 items-center gap-2">
              <span className="shrink-0">Results</span>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <div className="scrollbar-none min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex min-w-max items-center justify-end gap-2 pr-1">
                  {resultTabs.length
                    ? resultTabs.map((resultTab) => {
                        const isActive = resultTab.id === activeResult?.id
                        const isEditing = editingTabId === resultTab.id

                        return (
                          <div
                            key={resultTab.id}
                            className={`flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] normal-case tracking-normal ${
                              isActive
                                ? 'border-border bg-[#3a3a3a] text-foreground'
                                : 'border-border bg-surface text-muted-foreground'
                            }`}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                value={resultTab.name}
                                onChange={(event) => {
                                  const value = event.target.value
                                  setResultTabs((currentTabs) =>
                                    currentTabs.map((tab) =>
                                      tab.id === resultTab.id ? { ...tab, name: value } : tab,
                                    ),
                                  )
                                }}
                                onBlur={() => finishRenamingTab(resultTab.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    finishRenamingTab(resultTab.id)
                                  } else if (event.key === 'Escape') {
                                    event.preventDefault()
                                    setEditingTabId(null)
                                  }
                                }}
                                className="min-w-16 max-w-36 truncate bg-transparent font-medium outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                className="min-w-0 max-w-36 truncate font-medium"
                                onClick={() => {
                                  setActiveResultId(resultTab.id)
                                  setSql(resultTab.sql)
                                }}
                                onDoubleClick={() => setEditingTabId(resultTab.id)}
                              >
                                {resultTab.name}
                              </button>
                            )}
                            <button
                              type="button"
                              className="text-muted-foreground transition-colors hover:text-foreground"
                              onClick={() => setEditingTabId(resultTab.id)}
                              aria-label={`Rename ${resultTab.name}`}
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="text-muted-foreground transition-colors hover:text-foreground"
                              onClick={() => closeResultTab(resultTab.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })
                    : null}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 normal-case tracking-normal"
                onClick={() => {
                  setResultTabs([])
                  setActiveResultId(null)
                  setEditingTabId(null)
                }}
                disabled={!resultTabs.length}
              >
                Close All
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {activeResult ? (
              <DataTable
                key={activeResult.id}
                columns={activeResult.columns}
                rows={activeResult.rows}
                className="h-full rounded-none border-0 bg-transparent"
                columnTooltips
                emptyMessage="The active result tab returned no rows."
                fillHeight
                scrollClassName="h-full max-h-full"
                virtualizeRows
              />
            ) : (
              <DataTable
                columns={[]}
                rows={[]}
                className="flex h-full items-center justify-center rounded-none border-0 bg-transparent"
                emptyMessage={
                  hasDatabase
                    ? isExecuting
                      ? 'Executing query...'
                      : 'Run a read-only query to create a result tab.'
                    : 'Load a SQLite database to execute SQL.'
                }
              />
            )}
          </div>
          <div className="flex h-[52px] items-center justify-between gap-3 border-t border-border px-3 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>
                Rows:{' '}
                <span className="font-medium text-foreground">
                  {activeResult?.rowCount ?? 0}
                </span>
              </span>
              <span>
                Columns:{' '}
                <span className="font-medium text-foreground">
                  {activeResult?.columns.length ?? 0}
                </span>
              </span>
              <span>
                Time:{' '}
                <span className="font-medium text-foreground">
                  {activeResult ? `${activeResult.durationMs.toFixed(1)} ms` : '0.0 ms'}
                </span>
              </span>
            </div>
            <span className="truncate text-right text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Active:{' '}
              <span className="font-medium text-foreground">
                {activeResult?.name ?? 'None'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
