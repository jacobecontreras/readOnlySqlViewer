import {
  ChevronDown,
  ChevronRight,
  Eye,
  Search,
  TableProperties,
  Tags,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { DataTable } from '@/components/database/data-table'
import { useDbViewer } from '@/context/use-db-viewer'
import { sqliteClient } from '@/lib/sqlite-client'
import { cn } from '@/lib/utils'
import type { DatabaseStructure } from '@/lib/sqlite'

function normalizeForSearch(value: string) {
  return value.toLowerCase()
}

type StructureGroupKey = 'tables' | 'indexes' | 'views' | 'triggers'

type StructureRow = {
  id: string
  group: StructureGroupKey
  kind: 'group' | 'object'
  name: string
  objectType: string
  schema: string
  count?: number
}

const STRUCTURE_COLUMNS = ['Name', 'Type', 'Schema']

export function StructurePanel() {
  const { databaseRevision, hasDatabase } = useDbViewer()
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadedRevision, setLoadedRevision] = useState<number | null>(null)
  const [structure, setStructure] = useState<DatabaseStructure | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<StructureGroupKey, boolean>>({
    tables: true,
    indexes: true,
    views: true,
    triggers: true,
  })

  useEffect(() => {
    let isActive = true

    if (!hasDatabase) {
      return () => {
        isActive = false
      }
    }

    void sqliteClient
      .getDatabaseStructure()
      .then((result) => {
        if (isActive) {
          setError(null)
          setLoadedRevision(databaseRevision)
          setStructure(result)
        }
      })
      .catch((nextError) => {
        if (isActive) {
          setStructure(null)
          setLoadedRevision(databaseRevision)
          setError(
            nextError instanceof Error ? nextError.message : 'Failed to load database structure.',
          )
        }
      })

    return () => {
      isActive = false
    }
  }, [databaseRevision, hasDatabase])

  const query = normalizeForSearch(search.trim())
  const filteredStructure = useMemo(() => {
    if (!structure) {
      return null
    }

    if (!query) {
      return structure
    }

    const tables = structure.tables.filter((table) => {
      const searchable = [
        table.name,
        table.sql,
        ...table.columns.flatMap((column) => [
          column.name,
          column.type,
          column.defaultValue ?? '',
        ]),
        ...table.indexes.flatMap((index) => [index.name, index.columns.join(' ')]),
        ...table.foreignKeys.flatMap((foreignKey) => [
          foreignKey.table,
          foreignKey.from,
          foreignKey.to,
        ]),
      ]

      return searchable.some((value) => normalizeForSearch(value).includes(query))
    })

    const indexes = structure.indexes.filter((index) =>
      normalizeForSearch(`${index.name} ${index.sql}`).includes(query),
    )

    const views = structure.views.filter((view) =>
      normalizeForSearch(`${view.name} ${view.sql}`).includes(query),
    )

    const triggers = structure.triggers.filter((trigger) =>
      normalizeForSearch(`${trigger.name} ${trigger.sql}`).includes(query),
    )

    return { tables, indexes, views, triggers }
  }, [query, structure])

  const rows = useMemo(() => {
    if (!filteredStructure) {
      return [] as StructureRow[]
    }

    const nextRows: StructureRow[] = []
    const groups: Array<{
      key: StructureGroupKey
      label: string
      items: Array<{ name: string; sql: string }>
      typeLabel: string
    }> = [
      {
        key: 'tables',
        label: 'Tables',
        items: filteredStructure.tables.map((table) => ({ name: table.name, sql: table.sql })),
        typeLabel: 'table',
      },
      {
        key: 'indexes',
        label: 'Indices',
        items: filteredStructure.indexes,
        typeLabel: 'index',
      },
      {
        key: 'views',
        label: 'Views',
        items: filteredStructure.views,
        typeLabel: 'view',
      },
      {
        key: 'triggers',
        label: 'Triggers',
        items: filteredStructure.triggers,
        typeLabel: 'trigger',
      },
    ]

    for (const group of groups) {
      nextRows.push({
        id: `${group.key}-group`,
        group: group.key,
        kind: 'group',
        name: group.label,
        objectType: '',
        schema: '',
        count: group.items.length,
      })

      if (!expandedGroups[group.key]) {
        continue
      }

      nextRows.push(
        ...group.items.map((item) => ({
          id: `${group.key}-${item.name}`,
          group: group.key,
          kind: 'object' as const,
          name: item.name,
          objectType: group.typeLabel,
          schema: item.sql || '-- SQL definition unavailable',
        })),
      )
    }

    return nextRows
  }, [expandedGroups, filteredStructure])

  if (!hasDatabase) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
        Load a SQLite database to inspect its structure.
      </div>
    )
  }

  if (loadedRevision === databaseRevision && error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground"
      >
        {error}
      </div>
    )
  }

  if (loadedRevision !== databaseRevision || !structure || !filteredStructure) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
        Loading database structure...
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-col gap-3 pb-3">
        <div className="flex flex-col gap-2">
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted-foreground lg:w-80">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full min-w-0 bg-transparent outline-none"
              placeholder="Search schema objects"
            />
          </label>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden pt-3">
        <DataTable
          className="h-full"
          fillHeight
          scrollClassName="h-full max-h-full"
          columns={STRUCTURE_COLUMNS}
          rows={rows.map((row) => [row.name, row.objectType, row.schema])}
          cellClassName={({ column }) =>
            column === 'Schema' ? 'max-w-none whitespace-nowrap' : undefined
          }
          contentClassName={({ column }) =>
            column === 'Schema' ? 'overflow-visible whitespace-nowrap' : undefined
          }
          emptyMessage="No schema objects match the current search."
          getRowKey={(_, rowIndex) => rows[rowIndex]?.id ?? `row-${rowIndex}`}
          rowClassName={(_, rowIndex) =>
            rows[rowIndex]?.kind === 'group' ? 'cursor-pointer' : undefined
          }
          onRowClick={(_, rowIndex) => {
            const row = rows[rowIndex]
            if (row?.kind !== 'group') {
              return
            }

            setExpandedGroups((currentGroups) => ({
              ...currentGroups,
              [row.group]: !currentGroups[row.group],
            }))
          }}
          renderCell={({ column, rowIndex, value }) => {
            const row = rows[rowIndex]
            if (!row) {
              return value
            }

            if (column === 'Name') {
              const Icon =
                row.kind === 'group'
                  ? TableProperties
                  : row.group === 'tables'
                    ? TableProperties
                    : row.group === 'indexes'
                      ? Tags
                      : row.group === 'views'
                        ? Eye
                        : Zap

              return (
                <div
                  className={cn(
                    'flex items-center gap-2',
                    row.kind === 'object' ? 'pl-5' : '',
                  )}
                >
                  {row.kind === 'group' ? (
                    expandedGroups[row.group] ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-medium">
                    {row.kind === 'group' ? `${row.name} (${row.count ?? 0})` : String(value)}
                  </span>
                </div>
              )
            }

            if (row.kind === 'group') {
              return ''
            }

            return value
          }}
        />
      </div>
    </div>
  )
}
