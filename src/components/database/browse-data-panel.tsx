import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

import { DataTable } from '@/components/database/data-table'
import { Button } from '@/components/ui/button'
import { useDbViewer } from '@/context/use-db-viewer'
import { sqliteClient } from '@/lib/sqlite-client'
import type { SortDirection } from '@/lib/sqlite'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

export function BrowseDataPanel() {
  const {
    databaseRevision,
    hasDatabase,
    selectedTable,
    setSelectedTable,
    tableNames,
  } = useDbViewer()
  const [pageIndex, setPageIndex] = useState(0)
  const [goToPageValue, setGoToPageValue] = useState('1')
  const [globalFilter, setGlobalFilter] = useState('')
  const [sort, setSort] = useState<{
    column: string
    direction: SortDirection
  } | null>(null)
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false)
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rowCount, setRowCount] = useState(0)
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<Array<Array<string | number | Uint8Array | null>>>([])
  const tableMenuRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = useId()
  const optionIdPrefix = useId()
  const deferredGlobalFilter = useDeferredValue(globalFilter)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!tableMenuRef.current?.contains(event.target as Node)) {
        setIsTableMenuOpen(false)
        setActiveOptionIndex(-1)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const canFetch = hasDatabase && Boolean(selectedTable)

  const effectiveColumns = canFetch ? columns : []
  const effectiveRows = canFetch ? rows : []
  const effectiveRowCount = canFetch ? rowCount : 0
  const effectiveLoadError = canFetch ? loadError : null
  const effectiveIsLoading = canFetch && isLoading

  const pageCount = effectiveRowCount === 0 ? 1 : Math.ceil(effectiveRowCount / PAGE_SIZE)
  const maxPageIndex = Math.max(0, pageCount - 1)
  // Derive a clamped view of pageIndex so we never have to mutate state during
  // render when rowCount shrinks. pageIndex itself is normalized lazily the
  // next time the user navigates.
  const effectivePageIndex = Math.min(pageIndex, maxPageIndex)
  const pageStart = effectiveRowCount === 0 ? 0 : effectivePageIndex * PAGE_SIZE + 1
  const pageEnd =
    effectiveRowCount === 0
      ? 0
      : Math.min(effectiveRowCount, (effectivePageIndex + 1) * PAGE_SIZE)

  const goToPage = (nextIndex: number) => {
    const clamped = Math.min(Math.max(nextIndex, 0), maxPageIndex)
    setPageIndex(clamped)
    setGoToPageValue(String(clamped + 1))
  }

  useEffect(() => {
    if (!canFetch || !selectedTable) {
      return
    }

    let isActive = true
    // Marking the fetch as in-flight before awaiting the worker is the React
    // team's sanctioned pattern for async data loading; the rule warns because
    // cascading effect->setState chains are slow, but here the pairing is safe
    // because the follow-up updates are scheduled off of the worker response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setLoadError(null)

    void sqliteClient
      .getBrowseTableData({
        tableName: selectedTable,
        page: effectivePageIndex,
        pageSize: PAGE_SIZE,
        globalFilter: deferredGlobalFilter,
        sort,
      })
      .then((result) => {
        if (!isActive) {
          return
        }

        setColumns(result.columns)
        setRows(result.rows)
        setRowCount(result.rowCount)
      })
      .catch((error) => {
        if (!isActive) {
          return
        }

        setColumns([])
        setRows([])
        setRowCount(0)
        setLoadError(error instanceof Error ? error.message : 'Failed to load table data.')
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [
    canFetch,
    databaseRevision,
    deferredGlobalFilter,
    effectivePageIndex,
    selectedTable,
    sort,
  ])

  const commitSelectedTable = (tableName: string) => {
    // The panel is remounted via its `key` prop in App.tsx whenever
    // selectedTable changes, so filter/sort/page state is naturally reset.
    // Only menu-local UI state needs to be cleared here.
    setIsTableMenuOpen(false)
    setActiveOptionIndex(-1)
    setSelectedTable(tableName)
  }

  const openTableMenu = () => {
    if (!tableNames.length) {
      return
    }
    setIsTableMenuOpen(true)
    const selectedIndex = selectedTable ? tableNames.indexOf(selectedTable) : -1
    setActiveOptionIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }

  // Scroll the active option into view whenever it changes.
  useEffect(() => {
    if (!isTableMenuOpen || activeOptionIndex < 0) {
      return
    }
    optionRefs.current[activeOptionIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeOptionIndex, isTableMenuOpen])

  const handleTableComboboxKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (!tableNames.length) {
      return
    }

    if (!isTableMenuOpen) {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault()
        openTableMenu()
      }
      return
    }

    switch (event.key) {
      case 'Escape': {
        event.preventDefault()
        setIsTableMenuOpen(false)
        setActiveOptionIndex(-1)
        return
      }
      case 'ArrowDown': {
        event.preventDefault()
        setActiveOptionIndex((index) =>
          Math.min(tableNames.length - 1, (index < 0 ? -1 : index) + 1),
        )
        return
      }
      case 'ArrowUp': {
        event.preventDefault()
        setActiveOptionIndex((index) =>
          Math.max(0, (index < 0 ? tableNames.length : index) - 1),
        )
        return
      }
      case 'Home': {
        event.preventDefault()
        setActiveOptionIndex(0)
        return
      }
      case 'End': {
        event.preventDefault()
        setActiveOptionIndex(tableNames.length - 1)
        return
      }
      case 'Enter':
      case ' ': {
        event.preventDefault()
        const tableName = tableNames[activeOptionIndex]
        if (tableName) {
          commitSelectedTable(tableName)
        }
        return
      }
      case 'Tab': {
        setIsTableMenuOpen(false)
        setActiveOptionIndex(-1)
        return
      }
    }
  }

  const handleGoToPage = () => {
    if (!selectedTable) {
      return
    }

    const parsedValue = Number.parseInt(goToPageValue, 10)
    if (Number.isNaN(parsedValue)) {
      setGoToPageValue(String(effectivePageIndex + 1))
      return
    }

    goToPage(Math.max(parsedValue, 1) - 1)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-col gap-3 pb-3">
        {effectiveLoadError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground"
          >
            {effectiveLoadError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div
              ref={tableMenuRef}
              className="relative flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted-foreground"
            >
              <button
                type="button"
                className="flex min-w-44 items-center justify-between gap-2 text-xs font-medium text-foreground outline-none"
                onClick={() => {
                  if (isTableMenuOpen) {
                    setIsTableMenuOpen(false)
                    setActiveOptionIndex(-1)
                  } else {
                    openTableMenu()
                  }
                }}
                onKeyDown={handleTableComboboxKeyDown}
                disabled={!tableNames.length}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isTableMenuOpen}
                aria-controls={isTableMenuOpen ? listboxId : undefined}
                aria-activedescendant={
                  isTableMenuOpen && activeOptionIndex >= 0
                    ? `${optionIdPrefix}-${activeOptionIndex}`
                    : undefined
                }
                aria-label="Select table"
              >
                <span className="truncate">{selectedTable ?? 'Choose a table'}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
              {isTableMenuOpen ? (
                <div
                  id={listboxId}
                  className="absolute top-[calc(100%+8px)] left-0 z-20 w-full overflow-hidden rounded-lg border border-border bg-panel p-1 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                  role="listbox"
                  aria-label="Tables"
                >
                  <div className="max-h-64 overflow-auto">
                    {tableNames.map((tableName, optionIndex) => {
                      const isActive = optionIndex === activeOptionIndex
                      const isSelected = selectedTable === tableName
                      return (
                        <button
                          key={tableName}
                          ref={(element) => {
                            optionRefs.current[optionIndex] = element
                          }}
                          id={`${optionIdPrefix}-${optionIndex}`}
                          type="button"
                          className={cn(
                            'flex w-full items-center rounded-md px-3 py-2 text-left text-xs text-foreground transition-colors',
                            isActive ? 'bg-surface' : 'hover:bg-surface',
                          )}
                          onClick={() => commitSelectedTable(tableName)}
                          onMouseEnter={() => setActiveOptionIndex(optionIndex)}
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={-1}
                        >
                          {tableName}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <label className="flex min-w-56 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted-foreground">
              <input
                value={globalFilter}
                onChange={(event) => {
                  goToPage(0)
                  setGlobalFilter(event.target.value)
                }}
                placeholder="Filter rows"
                className="w-full bg-transparent text-foreground outline-none"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden pt-3">
        <DataTable
          columns={effectiveColumns}
          rows={effectiveRows}
          className="h-full"
          columnTooltips
          emptyMessage={
            effectiveIsLoading
              ? 'Loading table data...'
              : hasDatabase
                ? selectedTable
                  ? 'No rows returned for this table.'
                  : 'Choose a table to browse its data.'
                : 'Load a SQLite database to browse data.'
          }
          highlightTerms={[deferredGlobalFilter]}
          onSort={(column) => {
            goToPage(0)
            setSort((currentSort) => {
              if (!currentSort || currentSort.column !== column) {
                return { column, direction: 'asc' }
              }

              if (currentSort.direction === 'asc') {
                return { column, direction: 'desc' }
              }

              return null
            })
          }}
          resizableColumns
          fillHeight
          scrollClassName="h-full max-h-full"
          sort={sort}
        />
      </div>

      <div className="pt-2">
        <div className="flex flex-col gap-2 px-1 py-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex h-9 items-center gap-1.5 text-xs text-muted-foreground">
            <span>Showing</span>
            <span className="font-medium text-foreground">{pageStart}</span>
            <span aria-hidden="true">-</span>
            <span className="font-medium text-foreground">{pageEnd}</span>
            <span>of</span>
            <span className="font-medium text-foreground">{effectiveRowCount}</span>
            <span>rows</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(0)}
              disabled={!selectedTable || effectivePageIndex === 0 || effectiveIsLoading}
            >
              <ChevronsLeft className="h-4 w-4" />
              First
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(effectivePageIndex - 1)}
              disabled={!selectedTable || effectivePageIndex === 0 || effectiveIsLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="flex h-9 items-center gap-1.5 px-2 text-xs text-muted-foreground">
              <span>Page</span>
              <span className="font-medium text-foreground">{effectivePageIndex + 1}</span>
              <span>of</span>
              <span className="font-medium text-foreground">{pageCount}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(effectivePageIndex + 1)}
              disabled={
                !selectedTable || effectivePageIndex >= pageCount - 1 || effectiveIsLoading
              }
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(pageCount - 1)}
              disabled={
                !selectedTable || effectivePageIndex >= pageCount - 1 || effectiveIsLoading
              }
            >
              Last
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <div className="flex h-9 items-center gap-2 rounded-xl px-2">
              <span className="text-xs text-muted-foreground">Go to</span>
              <input
                value={goToPageValue}
                onChange={(event) =>
                  setGoToPageValue(event.target.value.replace(/[^\d]/g, ''))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleGoToPage()
                  }
                }}
                className="h-8 w-14 rounded-lg border border-border bg-panel px-2 text-center text-xs text-foreground outline-none"
                inputMode="numeric"
                disabled={!selectedTable || effectiveIsLoading}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGoToPage}
                disabled={!selectedTable || effectiveIsLoading}
              >
                Go
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
