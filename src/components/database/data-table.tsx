import {
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react'

import { formatCellValue, type SortDirection } from '@/lib/sqlite'
import { cn } from '@/lib/utils'

type DataTableCell = string | number | Uint8Array | null | ReactNode

type DataTableProps = {
  columns: string[]
  rows: Array<DataTableCell[]>
  emptyMessage: string
  className?: string
  cellClassName?: (props: {
    column: string
    columnIndex: number
    row: DataTableCell[]
    rowIndex: number
    value: DataTableCell
  }) => string | undefined
  columnTooltips?: boolean
  columnFilters?: Record<string, string>
  contentClassName?: (props: {
    column: string
    columnIndex: number
    row: DataTableCell[]
    rowIndex: number
    value: DataTableCell
  }) => string | undefined
  getRowKey?: (row: DataTableCell[], rowIndex: number) => string
  highlightTerms?: string[]
  onColumnFilterChange?: (column: string, value: string) => void
  onRowClick?: (row: DataTableCell[], rowIndex: number) => void
  onSort?: (column: string) => void
  renderCell?: (props: {
    column: string
    columnIndex: number
    row: DataTableCell[]
    rowIndex: number
    value: DataTableCell
  }) => ReactNode
  rowClassName?: (row: DataTableCell[], rowIndex: number) => string | undefined
  resizableColumns?: boolean
  scrollClassName?: string
  selectedRowKey?: string | null
  sort?: {
    column: string
    direction: SortDirection
  } | null
  stripedRows?: boolean
  virtualizeRows?: boolean
}

function renderHighlightedText(value: string, terms: string[]) {
  const filteredTerms = terms.filter(Boolean)
  if (!filteredTerms.length) {
    return value
  }

  const pattern = new RegExp(
    `(${filteredTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  )
  const parts = value.split(pattern)

  return parts.map((part, index) =>
    filteredTerms.some((term) => part.toLowerCase() === term.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-[#505050] px-1 text-foreground"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  )
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction?: SortDirection
}) {
  if (!active) {
    return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
  }

  return direction === 'asc' ? (
    <ArrowUpAZ className="h-4 w-4 text-foreground" />
  ) : (
    <ArrowDownAZ className="h-4 w-4 text-foreground" />
  )
}

export function DataTable({
  columns,
  rows,
  emptyMessage,
  className,
  cellClassName,
  columnTooltips = false,
  columnFilters,
  contentClassName,
  getRowKey,
  highlightTerms = [],
  onColumnFilterChange,
  onRowClick,
  onSort,
  renderCell,
  rowClassName,
  resizableColumns = false,
  scrollClassName,
  selectedRowKey,
  sort,
  stripedRows = true,
  virtualizeRows = false,
}: DataTableProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const dragStateRef = useRef<{
    column: string
    startWidth: number
    startX: number
  } | null>(null)
  const tableRef = useRef<HTMLTableElement | null>(null)
  const rowHeight = 49
  const viewportHeight = 448
  const overscan = 8
  const shouldVirtualize = virtualizeRows && rows.length > 120
  const { bottomSpacerHeight, visibleRows, visibleStartIndex } = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        bottomSpacerHeight: 0,
        visibleRows: rows,
        visibleStartIndex: 0,
      }
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2
    const nextVisibleRows = rows.slice(startIndex, startIndex + visibleCount)
    const remainingRows = Math.max(0, rows.length - (startIndex + nextVisibleRows.length))

    return {
      bottomSpacerHeight: remainingRows * rowHeight,
      visibleRows: nextVisibleRows,
      visibleStartIndex: startIndex,
    }
  }, [rows, scrollTop, shouldVirtualize])
  const topSpacerHeight = shouldVirtualize ? visibleStartIndex * rowHeight : 0

  useEffect(() => {
    if (!resizableColumns) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) {
        return
      }

      const nextWidth = Math.max(96, dragState.startWidth + (event.clientX - dragState.startX))
      setColumnWidths((currentWidths) => ({
        ...currentWidths,
        [dragState.column]: nextWidth,
      }))
    }

    const handleMouseUp = () => {
      dragStateRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizableColumns])

  const startColumnResize = (event: ReactMouseEvent<HTMLSpanElement>, column: string) => {
    if (!resizableColumns) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const tableElement = tableRef.current
    const headerIndex = columns.indexOf(column)
    const headerCell = tableElement?.querySelectorAll('th')[headerIndex] as HTMLTableCellElement | undefined
    const startWidth = columnWidths[column] ?? headerCell?.getBoundingClientRect().width ?? 160

    dragStateRef.current = {
      column,
      startWidth,
      startX: event.clientX,
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  if (!columns.length) {
    return (
      <div
        className={cn(
          'flex h-full min-h-0 items-center justify-center rounded-xl border border-border bg-panel px-4 py-10 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('min-h-0 overflow-hidden rounded-xl border border-border bg-panel', className)}>
      <div
        className={cn('max-h-[28rem] overflow-auto', scrollClassName)}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <table ref={tableRef} className="min-w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[#303030] text-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-border px-3 py-2 font-medium whitespace-nowrap"
                  style={
                    columnWidths[column]
                      ? {
                          width: columnWidths[column],
                          minWidth: columnWidths[column],
                        }
                      : undefined
                  }
                >
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      className="inline-flex min-w-0 items-center gap-2 pr-3"
                      onClick={() => onSort?.(column)}
                    >
                      <span className="truncate">{column}</span>
                      <SortIcon
                        active={sort?.column === column}
                        direction={sort?.direction}
                      />
                    </button>
                    {resizableColumns ? (
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        className="absolute top-[-8px] right-[-12px] h-[calc(100%+16px)] w-4 cursor-col-resize"
                        onMouseDown={(event) => startColumnResize(event, column)}
                      />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
            {onColumnFilterChange ? (
              <tr>
                {columns.map((column) => (
                  <th
                    key={`${column}-filter`}
                    className="border-b border-border px-3 py-2"
                    style={
                      columnWidths[column]
                        ? {
                            width: columnWidths[column],
                            minWidth: columnWidths[column],
                          }
                        : undefined
                    }
                  >
                    <input
                      value={columnFilters?.[column] ?? ''}
                      onChange={(event) => onColumnFilterChange(column, event.target.value)}
                      placeholder={`Filter ${column}`}
                      className="w-full rounded-lg border border-border bg-panel px-2.5 py-1.5 text-[11px] font-normal text-muted-foreground outline-none"
                    />
                  </th>
                ))}
              </tr>
            ) : null}
          </thead>
          <tbody>
            {topSpacerHeight ? (
              <tr>
                <td colSpan={columns.length} style={{ height: topSpacerHeight }} />
              </tr>
            ) : null}
            {visibleRows.map((row, rowIndex) => (
              <tr
                key={
                  getRowKey?.(row, visibleStartIndex + rowIndex) ??
                  `${visibleStartIndex + rowIndex}-${row
                    .map((value) => (typeof value === 'string' || typeof value === 'number' ? value : ''))
                    .join('|')}`
                }
                className={cn(
                  stripedRows ? 'odd:bg-surface/40' : '',
                  onRowClick ? 'cursor-pointer' : '',
                  selectedRowKey &&
                    getRowKey?.(row, visibleStartIndex + rowIndex) === selectedRowKey
                    ? 'bg-[#0b57d0] text-white'
                    : '',
                  rowClassName?.(row, visibleStartIndex + rowIndex),
                )}
                onClick={() => onRowClick?.(row, visibleStartIndex + rowIndex)}
              >
                {row.map((value, columnIndex) => (
                  <td
                    key={`${visibleStartIndex + rowIndex}-${columns[columnIndex]}`}
                    className={cn(
                      'max-w-80 border-b border-border/70 px-3 py-2 align-top text-muted-foreground',
                      cellClassName?.({
                        column: columns[columnIndex],
                        columnIndex,
                        row,
                        rowIndex: visibleStartIndex + rowIndex,
                        value,
                      }),
                    )}
                    style={
                      columnWidths[columns[columnIndex]]
                        ? {
                            width: columnWidths[columns[columnIndex]],
                            minWidth: columnWidths[columns[columnIndex]],
                          }
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        'block truncate',
                        contentClassName?.({
                          column: columns[columnIndex],
                          columnIndex,
                          row,
                          rowIndex: visibleStartIndex + rowIndex,
                          value,
                        }),
                      )}
                      title={
                        columnTooltips &&
                        !isValidElement(value) &&
                        (typeof value === 'string' ||
                          typeof value === 'number' ||
                          value === null ||
                          value instanceof Uint8Array)
                          ? formatCellValue(value)
                          : undefined
                      }
                    >
                      {renderCell
                        ? renderCell({
                            column: columns[columnIndex],
                            columnIndex,
                            row,
                            rowIndex: visibleStartIndex + rowIndex,
                            value,
                          })
                        : isValidElement(value)
                          ? value
                          : renderHighlightedText(
                              formatCellValue(
                                value as string | number | Uint8Array | null,
                              ),
                              highlightTerms,
                            )}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {bottomSpacerHeight ? (
              <tr>
                <td colSpan={columns.length} style={{ height: bottomSpacerHeight }} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
