import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

let sqlJsPromise: Promise<SqlJsStatic> | null = null

export function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: () => wasmUrl,
    })
  }

  return sqlJsPromise
}

export function createDatabase(bytes: Uint8Array) {
  return getSqlJs().then((SQL) => new SQL.Database(bytes))
}

export function listTables(database: Database) {
  const result = database.exec(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name COLLATE NOCASE
  `)

  const first = result[0]
  if (!first) {
    return []
  }

  return first.values.map(([name]) => String(name))
}

export function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

export function getTableRowCount(database: Database, tableName: string) {
  const result = database.exec(
    `SELECT COUNT(*) AS total FROM ${quoteIdentifier(tableName)}`,
  )

  return Number(result[0]?.values[0]?.[0] ?? 0)
}

export type SortDirection = 'asc' | 'desc'

export type TableQueryOptions = {
  page: number
  pageSize: number
  globalFilter?: string
  columnFilters?: Record<string, string>
  sort?: {
    column: string
    direction: SortDirection
  } | null
}

export function getTableColumns(database: Database, tableName: string) {
  return getSingleValueRows(database, `PRAGMA table_info(${quoteIdentifier(tableName)})`).map(
    ([, columnName, type]) => ({
      name: String(columnName),
      type: String(type || ''),
    }),
  )
}

function quoteSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

function escapeLikeValue(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

function buildTableWhereClause(
  columns: Array<{ name: string }>,
  globalFilter?: string,
  columnFilters?: Record<string, string>,
) {
  const clauses: string[] = []

  if (globalFilter?.trim()) {
    const searchValue = `%${escapeLikeValue(globalFilter.trim())}%`
    clauses.push(
      `(${columns
        .map(
          (column) =>
            `CAST(${quoteIdentifier(column.name)} AS TEXT) LIKE ${quoteSqlString(searchValue)} ESCAPE '\\'`,
        )
        .join(' OR ')})`,
    )
  }

  for (const column of columns) {
    const value = columnFilters?.[column.name]?.trim()
    if (!value) {
      continue
    }

    const searchValue = `%${escapeLikeValue(value)}%`
    clauses.push(
      `CAST(${quoteIdentifier(column.name)} AS TEXT) LIKE ${quoteSqlString(searchValue)} ESCAPE '\\'`,
    )
  }

  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
}

export function getTablePage(
  database: Database,
  tableName: string,
  options: TableQueryOptions,
) {
  const columns = getTableColumns(database, tableName)
  const whereClause = buildTableWhereClause(
    columns,
    options.globalFilter,
    options.columnFilters,
  )
  const orderByClause = options.sort
    ? `ORDER BY ${quoteIdentifier(options.sort.column)} ${options.sort.direction.toUpperCase()}`
    : ''
  const offset = options.page * options.pageSize
  const result = database.exec(
    `
      SELECT *
      FROM ${quoteIdentifier(tableName)}
      ${whereClause}
      ${orderByClause}
      LIMIT ${options.pageSize} OFFSET ${offset}
    `,
  )

  if (!result[0]) {
    return {
      columns: columns.map((column) => column.name),
      rows: [] as Array<Array<string | number | Uint8Array | null>>,
    }
  }

  return {
    columns: result[0].columns,
    rows: result[0].values,
  }
}

export function getFilteredTableRowCount(
  database: Database,
  tableName: string,
  globalFilter?: string,
  columnFilters?: Record<string, string>,
) {
  const columns = getTableColumns(database, tableName)
  const whereClause = buildTableWhereClause(columns, globalFilter, columnFilters)
  const result = database.exec(
    `
      SELECT COUNT(*) AS total
      FROM ${quoteIdentifier(tableName)}
      ${whereClause}
    `,
  )

  return Number(result[0]?.values[0]?.[0] ?? 0)
}

export function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function formatCellValue(value: string | number | Uint8Array | null) {
  if (value === null) {
    return 'NULL'
  }

  if (value instanceof Uint8Array) {
    return `<BLOB ${value.byteLength} bytes>`
  }

  return String(value)
}

export type SqlExecutionResult = {
  columns: string[]
  rows: Array<Array<string | number | Uint8Array | null>>
  durationMs: number
  rowCount: number
}

export type TableColumn = {
  cid: number
  name: string
  type: string
  notNull: boolean
  defaultValue: string | null
  primaryKeyPosition: number
}

export type TableIndex = {
  name: string
  unique: boolean
  origin: string
  partial: boolean
  columns: string[]
}

export type TableForeignKey = {
  id: number
  sequence: number
  table: string
  from: string
  to: string
  onUpdate: string
  onDelete: string
  match: string
}

export type TableStructure = {
  name: string
  sql: string
  columns: TableColumn[]
  indexes: TableIndex[]
  foreignKeys: TableForeignKey[]
}

export type SchemaObject = {
  name: string
  sql: string
}

export type DatabaseStructure = {
  tables: TableStructure[]
  indexes: SchemaObject[]
  views: SchemaObject[]
  triggers: SchemaObject[]
}

const READ_ONLY_SQL_PATTERN = /^(select|with|pragma|explain)\b/i

export function executeReadOnlySql(database: Database, sql: string): SqlExecutionResult {
  const normalized = sql.trim()

  if (!normalized) {
    throw new Error('Enter a SQL query before executing.')
  }

  if (!READ_ONLY_SQL_PATTERN.test(normalized)) {
    throw new Error('Only read-only SELECT, WITH, PRAGMA, and EXPLAIN statements are allowed.')
  }

  const startedAt = performance.now()
  const result = database.exec(normalized)
  const durationMs = performance.now() - startedAt
  const firstResult = result[0]

  return {
    columns: firstResult?.columns ?? [],
    rows: firstResult?.values ?? [],
    durationMs,
    rowCount: firstResult?.values.length ?? 0,
  }
}

function getSingleValueRows(database: Database, sql: string) {
  return database.exec(sql)[0]?.values ?? []
}

export function getDatabaseStructure(database: Database): DatabaseStructure {
  const tables = getSingleValueRows(
    database,
    `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name COLLATE NOCASE
    `,
  ).map(([name, sql]) => {
    const tableName = String(name)
    const escapedTableName = quoteIdentifier(tableName)
    const columns = getSingleValueRows(database, `PRAGMA table_info(${escapedTableName})`).map(
      ([cid, columnName, type, notNull, defaultValue, primaryKeyPosition]) => ({
        cid: Number(cid),
        name: String(columnName),
        type: String(type || ''),
        notNull: Boolean(notNull),
        defaultValue: defaultValue === null ? null : String(defaultValue),
        primaryKeyPosition: Number(primaryKeyPosition),
      }),
    )
    const indexes = getSingleValueRows(database, `PRAGMA index_list(${escapedTableName})`).map(
      ([, indexName, unique, origin, partial]) => {
        const safeIndexName = String(indexName).replaceAll("'", "''")
        const indexColumns = getSingleValueRows(
          database,
          `PRAGMA index_info('${safeIndexName}')`,
        ).map(([, , columnName]) => String(columnName))

        return {
          name: String(indexName),
          unique: Boolean(unique),
          origin: String(origin),
          partial: Boolean(partial),
          columns: indexColumns,
        }
      },
    )
    const foreignKeys = getSingleValueRows(
      database,
      `PRAGMA foreign_key_list(${escapedTableName})`,
    ).map(([id, sequence, foreignTable, from, to, onUpdate, onDelete, match]) => ({
      id: Number(id),
      sequence: Number(sequence),
      table: String(foreignTable),
      from: String(from),
      to: String(to),
      onUpdate: String(onUpdate),
      onDelete: String(onDelete),
      match: String(match),
    }))

    return {
      name: tableName,
      sql: String(sql || ''),
      columns,
      indexes,
      foreignKeys,
    }
  })

  const views = getSingleValueRows(
    database,
    `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'view'
      ORDER BY name COLLATE NOCASE
    `,
  ).map(([name, sql]) => ({
    name: String(name),
    sql: String(sql || ''),
  }))

  const indexes = getSingleValueRows(
    database,
    `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex_%'
      ORDER BY name COLLATE NOCASE
    `,
  ).map(([name, sql]) => ({
    name: String(name),
    sql: String(sql || ''),
  }))

  const triggers = getSingleValueRows(
    database,
    `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'trigger'
      ORDER BY name COLLATE NOCASE
    `,
  ).map(([name, sql]) => ({
    name: String(name),
    sql: String(sql || ''),
  }))

  return {
    tables,
    indexes,
    views,
    triggers,
  }
}
