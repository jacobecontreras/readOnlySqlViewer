declare module 'sql.js' {
  export type SqlJsStatic = {
    Database: new (data?: Uint8Array | ArrayLike<number>) => Database
  }

  export type QueryExecResult = {
    columns: string[]
    values: Array<Array<string | number | Uint8Array | null>>
  }

  export interface Database {
    close(): void
    exec(sql: string, params?: unknown[]): QueryExecResult[]
    iterateStatements(sql: string): StatementIterator
  }

  export interface Statement {
    free(): void
    getNormalizedSQL(): string
    getSQL(): string
  }

  export interface StatementIterator extends Iterable<Statement> {
    finalize(): void
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsStatic>
}
