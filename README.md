<p align="center">
  <a href="https://readonlysql.com"><img
    src="https://img.shields.io/badge/live-readonlysql.com-0366d6?style=flat-square"
    alt="Live site" /></a>
  <a href="https://github.com/jacobecontreras/readOnlySqlViewer/blob/main/LICENSE"><img
    src="https://img.shields.io/github/license/jacobecontreras/readOnlySqlViewer?style=flat-square"
    alt="MIT License" /></a>
</p>

![readOnlySQLViewer banned](public/readme-banner.webp)

Browser-only, read-only SQLite viewer. Drop a `.sqlite` or `.db` file to
inspect schema, browse rows, and run read-only SQL. The file
is loaded in memory in a Web Worker via [sql.js](https://sql.js.org).

## Features

- **Structure** — tables, indexes, views, triggers with SQL definitions
- **Browse** — paginated view, global filter, column sort and resize
- **SQL** — read-only query runner with timing and row/column counts
- **Read-only guard** — `SELECT`, `WITH`, `EXPLAIN`, and allowlisted
  introspection `PRAGMA` only; runs wrapped in `SAVEPOINT` / `ROLLBACK`
- **Large files** — up to ~500 MB

## Constraints

- `WITH` clauses that contain `INSERT` / `UPDATE` / `DELETE` / `REPLACE` are
  rejected
- `PRAGMA` assignments are rejected; introspection `PRAGMA` only
- One statement per execution (no multi-statement scripts)

## Showcase

### Structure

<p align="center">
  <a href="https://readonlysql.com"><img
    src="public/demo-photo3.webp"
    alt="ReadOnlySQL: structure — schema and database objects."
    width="900" /></a>
</p>

### Browse Data

<p align="center">
  <a href="https://readonlysql.com"><img
    src="public/demo-photo1.webp"
    alt="ReadOnlySQL: browse data in the table view."
    width="900" /></a>
</p>

### Execute SQL

<p align="center">
  <a href="https://readonlysql.com"><img
    src="public/demo-photo2.webp"
    alt="ReadOnlySQL: run SQL and view results."
    width="900" /></a>
</p>

## Stack

- React 19, TypeScript
- Vite, Tailwind CSS v4
- sql.js in a Web Worker
- Radix (Tabs, Slot), Lucide icons
