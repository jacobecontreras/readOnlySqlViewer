import initSqlJs, { type Database, type SqlJsStatic, type Statement } from 'sql.js'
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

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

export type SortDirection = 'asc' | 'desc'

type TableQueryOptions = {
  page: number
  pageSize: number
  globalFilter?: string
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

function escapeLikeValue(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

type TableFilterColumn = { name: string }

// Builds a parameterized WHERE clause and the params it expects. The same
// LIKE pattern is bound once per searchable column so identifiers stay quoted
// (sqlite cannot bind identifiers) but user input never lands in the SQL string.
function buildTableWhereClause(
  columns: TableFilterColumn[],
  globalFilter: string | undefined,
): { clause: string; params: Array<string | number> } {
  const trimmed = globalFilter?.trim()
  if (!trimmed || columns.length === 0) {
    return { clause: '', params: [] }
  }

  const likePattern = `%${escapeLikeValue(trimmed)}%`
  const params = columns.map(() => likePattern)
  const expression = columns
    .map(
      (column) =>
        `CAST(${quoteIdentifier(column.name)} AS TEXT) LIKE ? ESCAPE '\\'`,
    )
    .join(' OR ')

  return { clause: `WHERE (${expression})`, params }
}

export function getTablePage(
  database: Database,
  tableName: string,
  columns: TableFilterColumn[],
  options: TableQueryOptions,
) {
  const { clause: whereClause, params: whereParams } = buildTableWhereClause(
    columns,
    options.globalFilter,
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
      LIMIT ? OFFSET ?
    `,
    [...whereParams, options.pageSize, offset],
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
  columns: TableFilterColumn[],
  globalFilter?: string,
) {
  const { clause: whereClause, params: whereParams } = buildTableWhereClause(
    columns,
    globalFilter,
  )
  const result = database.exec(
    `
      SELECT COUNT(*) AS total
      FROM ${quoteIdentifier(tableName)}
      ${whereClause}
    `,
    whereParams,
  )

  return Number(result[0]?.values[0]?.[0] ?? 0)
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

type TableColumn = {
  cid: number
  name: string
  type: string
  notNull: boolean
  defaultValue: string | null
  primaryKeyPosition: number
}

type TableIndex = {
  name: string
  unique: boolean
  origin: string
  partial: boolean
  columns: string[]
}

type TableForeignKey = {
  id: number
  sequence: number
  table: string
  from: string
  to: string
  onUpdate: string
  onDelete: string
  match: string
}

type TableStructure = {
  name: string
  sql: string
  columns: TableColumn[]
  indexes: TableIndex[]
  foreignKeys: TableForeignKey[]
}

type SchemaObject = {
  name: string
  sql: string
}

export type DatabaseStructure = {
  tables: TableStructure[]
  indexes: SchemaObject[]
  views: SchemaObject[]
  triggers: SchemaObject[]
}

const READ_ONLY_SAVEPOINT = '__read_only_sql__'
const READ_ONLY_LEADING_KEYWORDS = /^(select|with|pragma|explain)\b/i
const MUTATING_KEYWORD_IN_WITH = /\b(insert|update|delete|replace)\b/i

// Introspection PRAGMAs that never mutate state. Anything outside this
// allowlist is rejected to avoid silently mutating pragmas (e.g. journal_mode,
// foreign_keys, user_version) that SAVEPOINT cannot roll back.
const READ_ONLY_PRAGMA_NAMES = new Set([
  'collation_list',
  'compile_options',
  'data_version',
  'database_list',
  'foreign_key_check',
  'foreign_key_list',
  'freelist_count',
  'function_list',
  'index_info',
  'index_list',
  'index_xinfo',
  'integrity_check',
  'module_list',
  'page_count',
  'page_size',
  'pragma_list',
  'quick_check',
  'schema_version',
  'table_info',
  'table_xinfo',
  'user_version',
])

function assertReadOnlyStatement(normalizedStatement: string) {
  const trimmed = normalizedStatement.trim()

  if (!trimmed) {
    throw new Error('Enter a SQL query before executing.')
  }

  if (!READ_ONLY_LEADING_KEYWORDS.test(trimmed)) {
    throw new Error('Only read-only SELECT, WITH, PRAGMA, and EXPLAIN statements are allowed.')
  }

  if (/^pragma\b/i.test(trimmed)) {
    // PRAGMA assignments (`PRAGMA x = y` or `PRAGMA x(y)`) are not transactional
    // and would escape the SAVEPOINT rollback. Only accept bare PRAGMAs whose
    // names are on the read-only allowlist.
    const pragmaMatch = /^pragma\s+(?:[\w$]+\s*\.\s*)?([\w$]+)\s*(.*)$/i.exec(trimmed)
    const pragmaName = pragmaMatch?.[1]
    const pragmaRemainder = pragmaMatch?.[2] ?? ''
    if (!pragmaName) {
      throw new Error('Unsupported PRAGMA form.')
    }

    if (!READ_ONLY_PRAGMA_NAMES.has(pragmaName.toLowerCase())) {
      throw new Error(
        `PRAGMA "${pragmaName}" is not allowed here. Only read-only introspection PRAGMAs are supported.`,
      )
    }

    if (/=/.test(pragmaRemainder)) {
      throw new Error('PRAGMA assignments are not allowed.')
    }

    return
  }

  // CTE (`WITH ... INSERT/UPDATE/DELETE/REPLACE`) can mutate despite starting
  // with `WITH`. Reject if any DML keyword appears at a word boundary.
  if (/^with\b/i.test(trimmed) && MUTATING_KEYWORD_IN_WITH.test(trimmed)) {
    throw new Error('WITH clauses must not contain INSERT, UPDATE, DELETE, or REPLACE.')
  }
}

function getSingleNormalizedStatementSql(database: Database, sql: string) {
  let statementCount = 0
  let normalizedStatement = ''

  const iterator = database.iterateStatements(sql)[Symbol.iterator]()

  // Each Statement yielded by the iterator wraps a prepared sqlite3_stmt that
  // must be released. Advancing via .next() frees the previous one; stopping
  // early (e.g. after detecting a second statement or on an exception) leaves
  // the last yielded one alive. We free it explicitly, then finalize the
  // iterator to release any remaining prepared statements.
  let currentStatement: Statement | undefined

  try {
    while (true) {
      const result = iterator.next()
      if (result.done) {
        currentStatement = undefined
        break
      }

      currentStatement = result.value
      statementCount += 1

      if (statementCount === 1) {
        normalizedStatement =
          currentStatement.getNormalizedSQL().trim() || currentStatement.getSQL().trim()
      }

      if (statementCount > 1) {
        break
      }
    }
  } finally {
    currentStatement?.free()
    // finalize() releases any still-prepared statements held by the iterator.
    iterator.return?.()
  }

  if (statementCount === 0) {
    throw new Error('Enter a SQL query before executing.')
  }

  if (statementCount > 1) {
    throw new Error('Only a single read-only SQL statement is allowed.')
  }

  return normalizedStatement
}

export function executeReadOnlySql(database: Database, sql: string): SqlExecutionResult {
  const normalized = sql.trim()

  if (!normalized) {
    throw new Error('Enter a SQL query before executing.')
  }

  const normalizedStatement = getSingleNormalizedStatementSql(database, normalized)
  assertReadOnlyStatement(normalizedStatement)

  database.exec(`SAVEPOINT ${READ_ONLY_SAVEPOINT}`)

  try {
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
  } finally {
    database.exec(`ROLLBACK TO SAVEPOINT ${READ_ONLY_SAVEPOINT}`)
    database.exec(`RELEASE SAVEPOINT ${READ_ONLY_SAVEPOINT}`)
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
