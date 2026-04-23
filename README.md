# web-dbviewer

A browser-only, read-only SQLite database viewer. Drop a `.sqlite` / `.db`
file onto the page and inspect its schema, browse rows with sort and filter,
and run ad-hoc read-only SQL. The database is parsed and queried in-memory in
a Web Worker via [sql.js](https://sql.js.org); nothing is uploaded to a
server.

## Features

- **Structure panel** — tables, indexes, views, and triggers with their full
  SQL definitions.
- **Browse Data panel** — paginated table viewer with global filter, column
  sort, and column resizing.
- **Execute SQL panel** — multi-tab read-only query runner with inline
  timing and row/column counts.
- **Read-only guard** — queries are restricted to `SELECT`, `WITH`, `EXPLAIN`,
  and an allowlist of introspection `PRAGMA`s; executions are wrapped in a
  SAVEPOINT / ROLLBACK to prevent unintended state changes.
- **Large-file support** — up to 500 MB per database (timeout-adjusted per
  operation).

## Constraints

- `WITH` clauses containing `INSERT`/`UPDATE`/`DELETE`/`REPLACE` are rejected.
- `PRAGMA` assignments (`PRAGMA x = y` or `PRAGMA x(y)`) are rejected; only
  introspection pragmas are allowed.
- Multi-statement queries are rejected — one statement per execution.

## Local development

Requires Node 20+.

```bash
npm install
npm run dev        # Vite dev server
npm run build      # type-check + production build to dist/
npm run lint       # ESLint
npm run preview    # serve the production build
```

## Stack

- React 19 + TypeScript (strict, `noUncheckedIndexedAccess`)
- Vite + Tailwind CSS v4
- sql.js in a dedicated Web Worker (see `src/lib/sqlite-worker.ts`)
- Radix Tabs + Slot for primitives; Lucide icons
