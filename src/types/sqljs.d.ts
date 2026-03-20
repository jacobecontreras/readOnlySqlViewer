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
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsStatic>
}
