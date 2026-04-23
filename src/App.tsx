import { AlertTriangle, Info, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AboutDialog } from '@/components/about-dialog'
import { BrowseDataPanel } from '@/components/database/browse-data-panel'
import { ExecuteSqlPanel } from '@/components/database/execute-sql-panel'
import { FileDropzone } from '@/components/database/file-dropzone'
import { StructurePanel } from '@/components/database/structure-panel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDbViewer } from '@/context/use-db-viewer'

const ABOUT_HIDDEN_KEY = 'readonlysql:about-hidden'

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  )
}

function App() {
  const {
    clearError,
    databaseRevision,
    databaseSummary,
    error,
    filePickerRequestKey,
    hasDatabase,
    loadDatabase,
    requestFilePicker,
    selectedTable,
    status,
    unloadDatabase,
  } = useDbViewer()

  const isBusy = status === 'initializing' || status === 'loading'

  const [aboutOpen, setAboutOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    let hidden = false
    try {
      hidden = window.localStorage.getItem(ABOUT_HIDDEN_KEY) === '1'
    } catch {
      hidden = false
    }
    setDontShowAgain(hidden)
    if (!hidden) {
      setAboutOpen(true)
    }
  }, [])

  const handleDontShowAgainChange = (value: boolean) => {
    setDontShowAgain(value)
    try {
      if (value) {
        window.localStorage.setItem(ABOUT_HIDDEN_KEY, '1')
      } else {
        window.localStorage.removeItem(ABOUT_HIDDEN_KEY)
      }
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }

  const handleAboutClose = () => {
    setAboutOpen(false)
  }

  return (
    <main
      className="h-full overflow-hidden bg-background text-foreground"
      onKeyDownCapture={(event) => {
        if (!(event.metaKey || event.ctrlKey) || isEditableTarget(event.target)) {
          return
        }

        if (event.key.toLowerCase() === 'o') {
          event.preventDefault()
          requestFilePicker()
        }
      }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden p-3 sm:p-4">
        <section
          aria-label={hasDatabase ? 'SQLite database viewer' : 'ReadOnlySQL'}
          className="min-h-0 flex-1 overflow-hidden"
        >
          <Tabs defaultValue="structure" className="h-full w-full">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex flex-col gap-2 px-3 py-2 sm:px-4">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileDropzone
                      disabled={isBusy}
                      fileName={databaseSummary?.fileName}
                      isLoading={isBusy}
                      openRequestKey={filePickerRequestKey}
                      onFileSelect={loadDatabase}
                      onUnload={() => void unloadDatabase()}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAboutOpen(true)}
                      className="h-9 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
                      aria-label="About ReadOnlySQL"
                    >
                      <Info className="h-4 w-4" aria-hidden="true" />
                      About
                    </Button>
                  </div>
                  {hasDatabase ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="flex h-9 min-w-0 items-center px-1 text-sm text-muted-foreground">
                        <span className="truncate font-medium text-foreground">
                          {databaseSummary?.fileName ?? 'None'}
                        </span>
                      </div>
                      <TabsList
                        aria-label="Database panels"
                        className="h-9 w-auto flex-nowrap rounded-xl border-border/70 bg-surface/95"
                      >
                        <TabsTrigger value="structure" className="min-w-[7rem] px-3">
                          Structure
                        </TabsTrigger>
                        <TabsTrigger value="browse" className="min-w-[7rem] px-3">
                          Browse Data
                        </TabsTrigger>
                        <TabsTrigger value="sql" className="min-w-[7rem] px-3">
                          Execute SQL
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  ) : null}
                </div>

                {error ? (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="flex-1">
                        <p>{error}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-auto px-0 py-0 text-foreground hover:bg-transparent"
                          onClick={clearError}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
                {hasDatabase ? (
                  <>
                    <TabsContent value="structure" className="h-full">
                      <StructurePanel />
                    </TabsContent>
                    <TabsContent value="browse" className="h-full">
                      <BrowseDataPanel
                        key={`${databaseRevision}:${selectedTable ?? ''}`}
                      />
                    </TabsContent>
                    <TabsContent value="sql" className="h-full">
                      <ExecuteSqlPanel key={databaseRevision} />
                    </TabsContent>
                  </>
                ) : (
                  <EmptyState disabled={isBusy} onBrowse={requestFilePicker} />
                )}
              </div>
            </div>
          </Tabs>
        </section>
      </div>

      <AboutDialog
        open={aboutOpen}
        onClose={handleAboutClose}
        dontShowAgain={dontShowAgain}
        onDontShowAgainChange={handleDontShowAgainChange}
      />
    </main>
  )
}

type EmptyStateProps = {
  disabled: boolean
  onBrowse: () => void
}

function EmptyState({ disabled, onBrowse }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <button
        type="button"
        onClick={onBrowse}
        disabled={disabled}
        className="group flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-panel/40 px-10 py-12 text-center transition-colors hover:border-foreground/30 hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud
          className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <p className="font-heading text-base font-medium text-foreground">
            Open a SQLite file
          </p>
          <p className="text-xs text-muted-foreground">
            Drop a <code>.sqlite</code> / <code>.db</code> file, click to browse, or press{' '}
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
              ⌘/Ctrl
            </kbd>{' '}
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
              O
            </kbd>
          </p>
        </div>
      </button>
    </div>
  )
}

export default App
