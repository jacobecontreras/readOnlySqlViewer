> **Educational project**, in **very early stages** of development.

<p align="center">
  <a href="https://readonlysql.com"><img
    src="https://img.shields.io/badge/live-readonlysql.com-0d9488?style=flat-square"
    alt="Live site" /></a>
  <a href="./LICENSE"><img
    src="https://img.shields.io/badge/license-MIT-555555?style=flat-square"
    alt="MIT License" /></a>
  <img
    src="https://img.shields.io/badge/React-19-20232a?style=flat-square&logo=react"
    alt="React 19"
  />
  <img
    src="https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white"
    alt="TypeScript"
  />
  <img
    src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white"
    alt="Vite"
  />
  <img
    src="https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white"
    alt="Tailwind CSS"
  />
</p>

<!--
  Optional badges (uncomment and fill in ORG/REPO or paths):

  GitHub Actions (after you add .github/workflows/ci.yml):
  ![CI](https://github.com/ORG/REPO/actions/workflows/ci.yml/badge.svg)

  Repo license (dynamic; needs public GitHub repo):
  [![License](https://img.shields.io/github/license/ORG/REPO?style=flat-square)](./LICENSE)

  Release / version from tags:
  [![GitHub release](https://img.shields.io/github/v/release/ORG/REPO?style=flat-square)](https://github.com/ORG/REPO/releases)

  npm (if you publish a package):
  [![npm](https://img.shields.io/npm/v/PACKAGE_NAME?style=flat-square&logo=npm)](https://www.npmjs.com/package/PACKAGE_NAME)

  PRs welcome (static):
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
-->

<p align="center">
  <img
    src="public/og-image.png"
    alt="ReadOnlySQL — free online SQLite viewer in the browser. Read-only, WebAssembly, no upload."
    width="720"
  />
</p>

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

## Development

Requires Node 20+.

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

## Stack

- React 19, TypeScript
- Vite, Tailwind CSS v4
- sql.js in a Web Worker
- Radix (Tabs, Slot), Lucide icons
