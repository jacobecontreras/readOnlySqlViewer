import {
  Database,
  FileSearch,
  Keyboard,
  Lock,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

import { Button } from '@/components/ui/button'

type FeatureItem = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description: string
}

const FEATURES: FeatureItem[] = [
  {
    icon: ShieldCheck,
    title: 'Nothing is uploaded',
    description:
      'Your SQLite file is parsed and queried entirely in your browser using WebAssembly. No server, no account, no tracking.',
  },
  {
    icon: Lock,
    title: 'Read-only by design',
    description:
      'Only SELECT, WITH, EXPLAIN, and introspection PRAGMAs are allowed. Every query runs inside a SAVEPOINT/ROLLBACK so your file is never mutated.',
  },
  {
    icon: FileSearch,
    title: 'Full schema browser',
    description:
      'Inspect tables, indexes, views, and triggers with their original SQL definitions. Filter schema objects instantly.',
  },
  {
    icon: Database,
    title: 'Paginated data viewer',
    description:
      'Browse rows with column sort, column resizing, and global filter. Works smoothly on databases up to 500 MB.',
  },
  {
    icon: Terminal,
    title: 'Multi-tab SQL editor',
    description:
      'Run ad-hoc SELECT queries across multiple tabs, with inline timing and row/column counts on every execution.',
  },
  {
    icon: Zap,
    title: 'Instant and local',
    description:
      'Powered by sql.js in a dedicated Web Worker. Queries run on your machine at native-ish speeds — no network round-trips.',
  },
]

type FaqItem = {
  question: string
  answer: string
}

const FAQ: FaqItem[] = [
  {
    question: 'Is my SQLite database uploaded to a server?',
    answer:
      'No. ReadOnlySQL loads and queries your database entirely in the browser using a WebAssembly build of SQLite that runs inside a Web Worker. Your file never leaves your device.',
  },
  {
    question: 'What file types can I open?',
    answer:
      'Any SQLite database file, including .sqlite, .sqlite3, .db, and .db3. Files up to 500 MB are supported per session.',
  },
  {
    question: 'Can I edit the database?',
    answer:
      'No. ReadOnlySQL is a read-only SQLite viewer. Only SELECT, WITH, EXPLAIN, and a safe allowlist of introspection PRAGMAs are accepted. Destructive statements are rejected before execution.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'No. ReadOnlySQL runs in any modern browser with WebAssembly support — Chrome, Edge, Firefox, or Safari. There is nothing to download or install.',
  },
  {
    question: 'Is ReadOnlySQL free?',
    answer:
      'Yes. ReadOnlySQL is free to use, with no account and no ads.',
  },
  {
    question: 'How does it compare to DB Browser for SQLite?',
    answer:
      'DB Browser for SQLite is a full-featured desktop application that can modify databases. ReadOnlySQL is a browser-only, read-only viewer focused on fast schema inspection, safe SQL exploration, and zero-install access from any machine.',
  },
]

type LandingHeroProps = {
  disabled?: boolean
  onBrowse: () => void
}

export function LandingHero({ disabled = false, onBrowse }: LandingHeroProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <article className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-10 sm:py-14">
        <header className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            100% local — nothing is uploaded
          </span>
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            The free online SQLite viewer that runs in your browser
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            ReadOnlySQL opens <code className="rounded bg-panel px-1.5 py-0.5 text-sm">.sqlite</code>,{' '}
            <code className="rounded bg-panel px-1.5 py-0.5 text-sm">.sqlite3</code>, and{' '}
            <code className="rounded bg-panel px-1.5 py-0.5 text-sm">.db</code> files right in your
            browser. Inspect tables, indexes, views, and triggers, browse rows with sort and filter,
            and run read-only SELECT queries — without uploading your database anywhere.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              onClick={onBrowse}
              disabled={disabled}
              className="px-6"
            >
              Open a SQLite file
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
              or press <kbd className="rounded border border-border bg-panel px-1.5 py-0.5 font-mono text-[11px]">⌘/Ctrl</kbd>
              <kbd className="rounded border border-border bg-panel px-1.5 py-0.5 font-mono text-[11px]">O</kbd>
            </span>
          </div>
        </header>

        <section aria-labelledby="features-heading" className="flex flex-col gap-6">
          <h2
            id="features-heading"
            className="font-heading text-2xl font-semibold text-foreground sm:text-3xl"
          >
            Everything you need to explore a SQLite database
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <li
                  key={feature.title}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-5"
                >
                  <Icon className="h-5 w-5 text-foreground" aria-hidden="true" />
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-6">
          <h2
            id="how-it-works-heading"
            className="font-heading text-2xl font-semibold text-foreground sm:text-3xl"
          >
            How it works
          </h2>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <li className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-5">
              <span className="text-xs font-mono text-muted-foreground">Step 1</span>
              <h3 className="font-heading text-base font-semibold text-foreground">
                Drop or pick a file
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Click <strong>Browse</strong> or drag a <code>.sqlite</code> / <code>.db</code> file
                onto this page. The file stays on your device.
              </p>
            </li>
            <li className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-5">
              <span className="text-xs font-mono text-muted-foreground">Step 2</span>
              <h3 className="font-heading text-base font-semibold text-foreground">
                Explore schema and rows
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Switch between <strong>Structure</strong>, <strong>Browse&nbsp;Data</strong>, and
                <strong> Execute&nbsp;SQL</strong> to inspect, filter, and query.
              </p>
            </li>
            <li className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-5">
              <span className="text-xs font-mono text-muted-foreground">Step 3</span>
              <h3 className="font-heading text-base font-semibold text-foreground">
                Run read-only SQL
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Use SELECT, WITH, or EXPLAIN. Destructive statements are rejected automatically.
              </p>
            </li>
          </ol>
        </section>

        <section aria-labelledby="faq-heading" className="flex flex-col gap-6">
          <h2
            id="faq-heading"
            className="font-heading text-2xl font-semibold text-foreground sm:text-3xl"
          >
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-border bg-panel p-4 open:bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground">
                  <h3 className="font-heading text-base font-semibold">{item.question}</h3>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <footer className="flex flex-col items-start gap-2 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            ReadOnlySQL is built with React, Vite, and{' '}
            <a
              href="https://sql.js.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              sql.js
            </a>{' '}
            running inside a Web Worker.
          </p>
          <p>© {new Date().getFullYear()} ReadOnlySQL · readonlysql.com</p>
        </footer>
      </article>
    </div>
  )
}
