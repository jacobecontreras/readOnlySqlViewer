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

## SEO / hosting checklist

The app ships SEO-ready for deployment at `https://readonlysql.com/`:

- `index.html` — canonical URL, description, Open Graph, Twitter Card, JSON-LD
  (`Organization` + `WebSite` + `WebApplication` + `BreadcrumbList` +
  `FAQPage`), theme-color, manifest, and a full **static pre-hydration block**
  (H1, features, how-it-works, FAQ) inside `#root` so AI crawlers that do not
  execute JavaScript (GPTBot, ClaudeBot, PerplexityBot) still see the content.
  `src/main.tsx` strips it before React mounts.
- `src/components/about-dialog.tsx` — feature grid, how-it-works, and FAQ
  shown to real users in an info modal that auto-opens on first visit and is
  reachable any time via the in-app **About** button. (SEO is independent of
  this — crawlers consume the static block in `index.html`.)
- `public/robots.txt` — allow-list for Google, Bing, and all major AI
  crawlers; points at the sitemap.
- `public/sitemap.xml` — canonical URL list.
- `public/llms.txt` — plain-text "about this site" file for AI answer
  engines (emerging convention, cheap to maintain).
- `public/site.webmanifest` — PWA metadata with separate `any` / `maskable`
  icon purposes.
- `public/og-image.png` — 1200×630 social share image.
- `public/_headers` — Netlify cache, security, and CSP headers.

If you change the canonical host, update it in:

- `index.html` (`<link rel="canonical">`, `og:url`, `og:image`, `twitter:image`,
  and the JSON-LD `url` / `@id` fields).
- `public/robots.txt` (`Sitemap:` line).
- `public/sitemap.xml` (`<loc>`).

Host headers are configured in `public/_headers` for Netlify. The CSP uses
`script-src 'self' 'wasm-unsafe-eval'` which is required for sql.js to compile
its WebAssembly module without needing full `'unsafe-eval'`. If you migrate
off Netlify, translate the rules to the equivalent `vercel.json` /
`_redirects` / Cloudflare Pages format — all major hosts support the same
directives.

Post-deploy checklist:

1. Run [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview)
   on `https://readonlysql.com/` — expect ≥95 on SEO and Best Practices.
2. Submit `https://readonlysql.com/sitemap.xml` in
   [Google Search Console](https://search.google.com/search-console) and
   [Bing Webmaster Tools](https://www.bing.com/webmasters).
3. Validate structured data with the
   [Rich Results Test](https://search.google.com/test/rich-results) — expect
   `WebApplication` and `BreadcrumbList` to register. `FAQPage` is valid but
   Google restricts its rich-result display to government and health sites
   since August 2023; the markup still helps AI answer engines parse the
   Q&A.
4. Paste the URL into Slack / Twitter / LinkedIn / Facebook share debuggers
   to confirm the OG card renders with `og-image.png`.
5. Verify AI-crawler visibility with
   `curl -A "GPTBot" https://readonlysql.com/ | grep -i readonlysql` —
   you should see the H1, features, and FAQ text in the raw HTML.

### PNG icons

Generated from `public/favicon.svg` into a rounded, dark-bleed style that
matches the app theme:

- `public/apple-touch-icon.png` — 180×180, rounded corners, for iOS home screen.
- `public/icon-192.png`, `public/icon-512.png` — `purpose: "any"` (rounded).
- `public/icon-192-maskable.png`, `public/icon-512-maskable.png` — full-bleed
  with the logo inside the ~70% safe zone, `purpose: "maskable"` for Android
  adaptive icons.

To regenerate (requires ImageMagick):

```bash
magick -background none -density 1536 public/favicon.svg -resize 512x512 public/icon-512.png
magick -background none -density 1024 public/favicon.svg -resize 192x192 public/icon-192.png
magick -background none -density 1024 public/favicon.svg -resize 180x180 public/apple-touch-icon.png
```

For the maskable variants, wrap `favicon.svg` in a full-bleed `<rect fill="#1a1a1a">`
with the logo translated into the safe zone before rasterizing.
