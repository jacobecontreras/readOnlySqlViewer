import {
  Database,
  FileSearch,
  Lock,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

import { Dialog } from '@/components/ui/dialog'

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
      'Parsed and queried entirely in your browser via WebAssembly. No server, no account, no tracking.',
  },
  {
    icon: Lock,
    title: 'Read-only by design',
    description:
      'Only SELECT, WITH, EXPLAIN, and introspection PRAGMAs are allowed. Wrapped in SAVEPOINT/ROLLBACK so your file is never mutated.',
  },
  {
    icon: FileSearch,
    title: 'Full schema browser',
    description:
      'Inspect tables, indexes, views, and triggers with their original SQL. Filter schema instantly.',
  },
  {
    icon: Database,
    title: 'Paginated data viewer',
    description:
      'Sort, resize, and filter columns. Smooth on databases up to 500 MB.',
  },
  {
    icon: Terminal,
    title: 'Multi-tab SQL editor',
    description:
      'Run ad-hoc SELECT queries with inline timing and row/column counts.',
  },
  {
    icon: Zap,
    title: 'Instant and local',
    description:
      'Powered by sql.js in a Web Worker. No network round-trips.',
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
      'No. Only SELECT, WITH, EXPLAIN, and a safe allowlist of introspection PRAGMAs are accepted. Destructive statements are rejected before execution.',
  },
  {
    question: 'How does it compare to DB Browser for SQLite?',
    answer:
      'DB Browser for SQLite is a full-featured desktop app that can modify databases. ReadOnlySQL is a browser-only, read-only viewer focused on fast schema inspection, safe SQL exploration, and zero-install access from any machine.',
  },
]

type AboutDialogProps = {
  open: boolean
  onClose: () => void
  dontShowAgain: boolean
  onDontShowAgainChange: (value: boolean) => void
}

export function AboutDialog({
  open,
  onClose,
  dontShowAgain,
  onDontShowAgainChange,
}: AboutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ReadOnlySQL"
      description="The free online SQLite viewer that runs in your browser."
      footer={
        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface/80 px-5 py-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => onDontShowAgainChange(event.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-primary"
            />
            Don&rsquo;t show this again
          </label>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Got it
          </button>
        </div>
      }
    >
      <article className="flex flex-col gap-5 px-5 py-5">
        <section aria-labelledby="features-heading" className="flex flex-col gap-2">
          <h3
            id="features-heading"
            className="font-heading text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Features
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <li
                  key={feature.title}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-panel p-3"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                    <h4 className="font-heading text-xs font-semibold text-foreground">
                      {feature.title}
                    </h4>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="faq-heading" className="flex flex-col gap-2">
          <h3
            id="faq-heading"
            className="font-heading text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            FAQ
          </h3>
          <div className="flex flex-col gap-1.5">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-lg border border-border bg-panel px-3 py-2 open:bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-foreground">
                  <span className="font-heading font-semibold">{item.question}</span>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </article>
    </Dialog>
  )
}
