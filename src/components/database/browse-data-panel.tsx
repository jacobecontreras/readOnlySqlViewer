import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutPanelTop,
  Search,
} from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { DataTable } from '@/components/database/data-table'
import { Button } from '@/components/ui/button'
import { useDbViewer } from '@/context/use-db-viewer'
import {
  formatBytes,
  getFilteredTableRowCount,
  getTablePage,
  type SortDirection,
} from '@/lib/sqlite'

const PAGE_SIZE = 50

export function BrowseDataPanel() {
  const { database, databaseSummary, selectedTable, setSelectedTable, status, tableNames } =
    useDbViewer()
  const [pageIndex, setPageIndex] = useState(0)
  const [goToPageValue, setGoToPageValue] = useState('1')
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{
    column: string
    direction: SortDirection
  } | null>(null)
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false)
  const tableMenuRef = useRef<HTMLDivElement | null>(null)
  const deferredGlobalFilter = useDeferredValue(globalFilter)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!tableMenuRef.current?.contains(event.target as Node)) {
        setIsTableMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const rowCount = useMemo(() => {
    if (!database || !selectedTable) {
      return 0
    }

    return getFilteredTableRowCount(
      database,
      selectedTable,
      deferredGlobalFilter,
      columnFilters,
    )
  }, [columnFilters, database, deferredGlobalFilter, selectedTable])

  const { columns, rows } = useMemo(() => {
    if (!database || !selectedTable) {
      return {
        columns: [] as string[],
        rows: [] as Array<Array<string | number | Uint8Array | null>>,
      }
    }

    return getTablePage(database, selectedTable, {
      page: pageIndex,
      pageSize: PAGE_SIZE,
      globalFilter: deferredGlobalFilter,
      columnFilters,
      sort,
    })
  }, [columnFilters, database, deferredGlobalFilter, pageIndex, selectedTable, sort])

  const pageCount = rowCount === 0 ? 1 : Math.ceil(rowCount / PAGE_SIZE)
  const pageStart = rowCount === 0 ? 0 : pageIndex * PAGE_SIZE + 1
  const pageEnd = rowCount === 0 ? 0 : Math.min(rowCount, (pageIndex + 1) * PAGE_SIZE)
  const hasDatabase = Boolean(databaseSummary)
  const fileSizeLabel = databaseSummary ? formatBytes(databaseSummary.fileSize) : 'No file'

  useEffect(() => {
    setGoToPageValue(String(pageIndex + 1))
  }, [pageIndex])

  const handleGoToPage = () => {
    if (!selectedTable) {
      return
    }

    const parsedValue = Number.parseInt(goToPageValue, 10)
    if (Number.isNaN(parsedValue)) {
      setGoToPageValue(String(pageIndex + 1))
      return
    }

    const nextPage = Math.min(Math.max(parsedValue, 1), pageCount)
    setPageIndex(nextPage - 1)
    setGoToPageValue(String(nextPage))
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-col gap-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div
              ref={tableMenuRef}
              className="relative flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted-foreground"
            >
              <LayoutPanelTop className="h-3.5 w-3.5 shrink-0 text-foreground" />
              <button
                type="button"
                className="flex min-w-44 items-center justify-between gap-2 text-xs font-medium text-foreground outline-none"
                onClick={() => setIsTableMenuOpen((currentValue) => !currentValue)}
                disabled={!tableNames.length}
              >
                <span className="truncate">{selectedTable ?? 'Choose a table'}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
              {isTableMenuOpen ? (
                <div className="absolute top-[calc(100%+8px)] left-0 z-20 w-full overflow-hidden rounded-lg border border-border bg-panel p-1 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                  <div className="max-h-64 overflow-auto">
                    {tableNames.map((tableName) => (
                      <button
                        key={tableName}
                        type="button"
                        className="flex w-full items-center rounded-md px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-surface"
                        onClick={() => {
                          setIsTableMenuOpen(false)
                          setPageIndex(0)
                          setGlobalFilter('')
                          setColumnFilters({})
                          setSort(null)
                          setSelectedTable(tableName)
                        }}
                      >
                        {tableName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <label className="flex min-w-56 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted-foreground">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={globalFilter}
                onChange={(event) => {
                  setPageIndex(0)
                  setGlobalFilter(event.target.value)
                }}
                placeholder="Filter rows"
                className="w-full bg-transparent text-foreground outline-none"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted-foreground">
              Tables:{' '}
              <span className="font-medium text-foreground">
                {databaseSummary?.tableCount ?? 0}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted-foreground">
              Rows: <span className="font-medium text-foreground">{rowCount || status}</span>
            </div>
            <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted-foreground">
              Size: <span className="font-medium text-foreground">{fileSizeLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden pt-3">
        <DataTable
          columns={columns}
          rows={rows}
          className="h-full"
          columnFilters={columnFilters}
          columnTooltips
          emptyMessage={
            hasDatabase
              ? selectedTable
                ? 'No rows returned for this table.'
                : 'Choose a table to browse its data.'
              : 'Load a SQLite database to browse data.'
          }
          highlightTerms={[
            deferredGlobalFilter,
            ...Object.values(columnFilters).filter(Boolean),
          ]}
          onColumnFilterChange={(column, value) => {
            setPageIndex(0)
            setColumnFilters((currentFilters) => ({
              ...currentFilters,
              [column]: value,
            }))
          }}
          onSort={(column) => {
            setPageIndex(0)
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
          scrollClassName="h-full max-h-full"
          sort={sort}
          virtualizeRows
        />
      </div>

      <div className="pt-3">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-panel px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{pageStart}</span>-
            <span className="font-medium text-foreground">{pageEnd}</span> of{' '}
            <span className="font-medium text-foreground">{rowCount}</span> rows
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPageIndex(0)}
              disabled={!selectedTable || pageIndex === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
              First
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPageIndex((currentPage) => Math.max(0, currentPage - 1))}
              disabled={!selectedTable || pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              Page <span className="font-medium text-foreground">{pageIndex + 1}</span> of{' '}
              <span className="font-medium text-foreground">{pageCount}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setPageIndex((currentPage) => Math.min(pageCount - 1, currentPage + 1))
              }
              disabled={!selectedTable || pageIndex >= pageCount - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPageIndex(pageCount - 1)}
              disabled={!selectedTable || pageIndex >= pageCount - 1}
            >
              Last
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5">
              <span className="text-xs text-muted-foreground">Go to</span>
              <input
                value={goToPageValue}
                onChange={(event) =>
                  setGoToPageValue(event.target.value.replace(/[^\d]/g, '') || '')
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleGoToPage()
                  }
                }}
                className="w-12 bg-transparent text-center text-xs text-foreground outline-none"
                inputMode="numeric"
                disabled={!selectedTable}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoToPage}
                disabled={!selectedTable}
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
