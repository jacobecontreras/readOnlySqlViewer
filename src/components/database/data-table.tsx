import {
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react'

import { formatCellValue, type SortDirection } from '@/lib/sqlite'
import { cn } from '@/lib/utils'

// Virtualization constants
const DEFAULT_ROW_HEIGHT = 49 // Initial estimate, measured dynamically at runtime
const DEFAULT_VIEWPORT_HEIGHT = 448 // Initial estimate, measured dynamically at runtime
const VIRTUALIZATION_THRESHOLD = 120 // Only virtualize when rows exceed this count
const MAX_CONTAINER_HEIGHT = '28rem' // Max height for scroll container

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
  contentClassName?: (props: {
    column: string
    columnIndex: number
    row: DataTableCell[]
    rowIndex: number
    value: DataTableCell
  }) => string | undefined
  getRowKey?: (row: DataTableCell[], rowIndex: number) => string
  highlightTerms?: string[]
  /** When true, only rows where at least one cell's displayed text matches the highlight pattern are shown. */
  filterRowsByHighlight?: boolean
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
  // When true the scroll container fills its parent (height: 100%). Otherwise
  // it caps at MAX_CONTAINER_HEIGHT so the table degrades gracefully inside
  // intrinsically-sized layouts.
  fillHeight?: boolean
  selectedRowKey?: string | null
  sort?: {
    column: string
    direction: SortDirection
  } | null
  virtualizeRows?: boolean
}

function isScalarCellValue(
  value: unknown,
): value is string | number | Uint8Array | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    value instanceof Uint8Array
  )
}

// Narrow a DataTableCell that is not a React element down to the scalar shape
// SQL.js returns. Anything else renders as its `String(...)` form so we never
// hand a non-scalar to formatCellValue.
function toScalarCellValue(
  value: DataTableCell,
): string | number | Uint8Array | null {
  if (isScalarCellValue(value)) {
    return value
  }
  return String(value)
}

function renderHighlightedText(value: string, pattern: RegExp | null) {
  if (!pattern) {
    return value
  }

  // `String.split` with a capturing group interleaves non-match / match
  // segments, so odd indices are always the captured matches — no need to
  // re-check each part against the term list.
  const parts = value.split(pattern)

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark
        key={`${index}-${part}`}
        className="rounded bg-[#505050] px-1 text-foreground"
      >
        {part}
      </mark>
    ) : (
      <span key={`${index}-${part}`}>{part}</span>
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
  contentClassName,
  getRowKey,
  highlightTerms = [],
  filterRowsByHighlight = false,
  onRowClick,
  onSort,
  renderCell,
  rowClassName,
  resizableColumns = false,
  scrollClassName,
  fillHeight = false,
  selectedRowKey,
  sort,
  virtualizeRows = false,
}: DataTableProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT)
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_VIEWPORT_HEIGHT)
  const dragStateRef = useRef<{
    column: string
    startWidth: number
    startX: number
  } | null>(null)
  const tableRef = useRef<HTMLTableElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const overscan = 8

  // Memoize the highlight pattern to avoid rebuilding on every cell render
  const highlightPattern = useMemo(() => {
    const filteredTerms = highlightTerms.filter(Boolean)
    if (!filteredTerms.length) {
      return null
    }
    return new RegExp(
      `(${filteredTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'gi',
    )
  }, [highlightTerms])

  const displayRows = useMemo(() => {
    if (!filterRowsByHighlight || !highlightPattern) {
      return rows
    }
    const matchFlags = highlightPattern.flags.replace(/g/g, '')
    const rowTextMatches = (row: DataTableCell[]) => {
      const matcher = new RegExp(highlightPattern.source, matchFlags)
      return row.some((cell) => {
        const text = isValidElement(cell)
          ? String(cell)
          : formatCellValue(toScalarCellValue(cell))
        return text.search(matcher) !== -1
      })
    }
    return rows.filter(rowTextMatches)
  }, [filterRowsByHighlight, highlightPattern, rows])

  const shouldVirtualize =
    virtualizeRows && displayRows.length > VIRTUALIZATION_THRESHOLD
  const { bottomSpacerHeight, visibleRows, visibleStartIndex } = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        bottomSpacerHeight: 0,
        visibleRows: displayRows,
        visibleStartIndex: 0,
      }
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2
    const nextVisibleRows = displayRows.slice(startIndex, startIndex + visibleCount)
    const remainingRows = Math.max(
      0,
      displayRows.length - (startIndex + nextVisibleRows.length),
    )

    return {
      bottomSpacerHeight: remainingRows * rowHeight,
      visibleRows: nextVisibleRows,
      visibleStartIndex: startIndex,
    }
  }, [displayRows, rowHeight, scrollTop, shouldVirtualize, viewportHeight])
  const topSpacerHeight = shouldVirtualize ? visibleStartIndex * rowHeight : 0

  // Measure actual row height from the DOM. ResizeObserver picks up font
  // swaps, zoom changes, and content reflows automatically; the document.fonts
  // hook covers the case where the first measurement happens before custom
  // fonts have finished loading.
  useEffect(() => {
    if (!shouldVirtualize) {
      return
    }

    const tableElement = tableRef.current
    if (!tableElement) {
      return
    }

    const applyMeasurement = (height: number) => {
      if (height <= 0) {
        return
      }
      const rounded = Math.round(height)
      setRowHeight((currentHeight) =>
        currentHeight === rounded ? currentHeight : rounded,
      )
    }

    const measureFromDom = () => {
      const firstRow = tableElement.querySelector('tbody tr')
      if (firstRow) {
        applyMeasurement(firstRow.getBoundingClientRect().height)
      }
    }

    measureFromDom()

    let observed: Element | null = null
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        applyMeasurement(entry.contentRect.height)
      }
    })

    const observeFirstRow = () => {
      const firstRow = tableElement.querySelector('tbody tr')
      if (firstRow && firstRow !== observed) {
        if (observed) {
          resizeObserver.unobserve(observed)
        }
        resizeObserver.observe(firstRow)
        observed = firstRow
      }
    }

    observeFirstRow()

    // The tbody can swap rows in/out as the virtual window scrolls, so watch
    // it for childList changes and re-bind the observer to the new first row.
    const tbody = tableElement.querySelector('tbody')
    const mutationObserver = tbody
      ? new MutationObserver(() => {
          observeFirstRow()
          measureFromDom()
        })
      : null
    if (tbody && mutationObserver) {
      mutationObserver.observe(tbody, { childList: true })
    }

    let cancelled = false
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) {
          measureFromDom()
        }
      })
    }

    return () => {
      cancelled = true
      resizeObserver.disconnect()
      mutationObserver?.disconnect()
    }
  }, [shouldVirtualize])

  // Measure viewport height using ResizeObserver
  useEffect(() => {
    if (!shouldVirtualize) {
      return
    }

    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) {
      return
    }

    const syncViewportHeight = () => {
      const height = scrollContainer.clientHeight
      if (height > 0) {
        setViewportHeight((currentHeight) =>
          currentHeight === Math.round(height) ? currentHeight : Math.round(height),
        )
      }
    }

    syncViewportHeight()

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height
        if (height > 0) {
          setViewportHeight((currentHeight) =>
            currentHeight === Math.round(height) ? currentHeight : Math.round(height),
          )
        }
      }
    })

    resizeObserver.observe(scrollContainer)

    return () => {
      resizeObserver.disconnect()
    }
  }, [shouldVirtualize])


  const startColumnResize = (
    event: ReactPointerEvent<HTMLSpanElement>,
    column: string,
  ) => {
    if (!resizableColumns) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const tableElement = tableRef.current
    const headerIndex = columns.indexOf(column)
    const headerCell = tableElement?.querySelectorAll('th')[headerIndex]
    const startWidth = columnWidths[column] ?? headerCell?.getBoundingClientRect().width ?? 160

    dragStateRef.current = {
      column,
      startWidth,
      startX: event.clientX,
    }

    // Pointer capture routes subsequent move/up events to this element even
    // if the pointer leaves the handle, so the drag stays attached for mouse,
    // touch, and pen without needing window-level listeners.
    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleColumnResizeMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
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

  const endColumnResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!dragStateRef.current) {
      return
    }
    dragStateRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
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
    <div className={cn('min-h-0 overflow-hidden', className)}>
      <div
        ref={scrollContainerRef}
        style={fillHeight ? undefined : { maxHeight: MAX_CONTAINER_HEIGHT }}
        className={cn('overflow-auto', scrollClassName)}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <table ref={tableRef} className="min-w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[#303030] text-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-3 py-2 font-medium whitespace-nowrap"
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
                        className="absolute top-[-8px] right-[-12px] h-[calc(100%+16px)] w-4 cursor-col-resize touch-none"
                        onPointerDown={(event) => startColumnResize(event, column)}
                        onPointerMove={handleColumnResizeMove}
                        onPointerUp={endColumnResize}
                        onPointerCancel={endColumnResize}
                      />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
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
                  `row-${visibleStartIndex + rowIndex}`
                }
                className={cn(
                  selectedRowKey &&
                    getRowKey?.(row, visibleStartIndex + rowIndex) === selectedRowKey
                    ? 'bg-[#0b57d0] text-white'
                    : '',
                  rowClassName?.(row, visibleStartIndex + rowIndex),
                )}
                onClick={() => onRowClick?.(row, visibleStartIndex + rowIndex)}
              >
                {row.map((value, columnIndex) => {
                  const column = columns[columnIndex]
                  if (column === undefined) {
                    return null
                  }
                  const absoluteRowIndex = visibleStartIndex + rowIndex
                  const columnWidth = columnWidths[column]
                  return (
                    <td
                      key={`${absoluteRowIndex}-${column}`}
                      className={cn(
                        'max-w-80 px-3 py-2 align-top text-muted-foreground',
                        cellClassName?.({
                          column,
                          columnIndex,
                          row,
                          rowIndex: absoluteRowIndex,
                          value,
                        }),
                      )}
                      style={
                        columnWidth
                          ? {
                              width: columnWidth,
                              minWidth: columnWidth,
                            }
                          : undefined
                      }
                    >
                      <span
                        className={cn(
                          'block truncate',
                          contentClassName?.({
                            column,
                            columnIndex,
                            row,
                            rowIndex: absoluteRowIndex,
                            value,
                          }),
                        )}
                        title={
                          columnTooltips && !isValidElement(value) && isScalarCellValue(value)
                            ? formatCellValue(value)
                            : undefined
                        }
                      >
                        {renderCell
                          ? renderCell({
                              column,
                              columnIndex,
                              row,
                              rowIndex: absoluteRowIndex,
                              value,
                            })
                          : isValidElement(value)
                            ? value
                            : renderHighlightedText(
                                formatCellValue(toScalarCellValue(value)),
                                highlightPattern,
                              )}
                      </span>
                    </td>
                  )
                })}
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
