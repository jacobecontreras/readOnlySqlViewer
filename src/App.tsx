import { useEffect } from 'react'
import { AlertTriangle, FileCode2, FileSearch, TerminalSquare } from 'lucide-react'

import { BrowseDataPanel } from '@/components/database/browse-data-panel'
import { ExecuteSqlPanel } from '@/components/database/execute-sql-panel'
import { FileDropzone } from '@/components/database/file-dropzone'
import { StructurePanel } from '@/components/database/structure-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDbViewer } from '@/context/use-db-viewer'

function App() {
  const {
    clearError,
    databaseSummary,
    error,
    filePickerRequestKey,
    loadDatabase,
    requestFilePicker,
    status,
    unloadDatabase,
  } = useDbViewer()

  const isBusy = status === 'initializing' || status === 'loading'

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return
      }

      if (event.key.toLowerCase() === 'o') {
        event.preventDefault()
        requestFilePicker()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [requestFilePicker])

  return (
    <main className="h-full overflow-hidden bg-background text-foreground">
      <div className="flex h-full w-full flex-col overflow-hidden p-3 sm:p-4">
        <section className="min-h-0 flex-1 overflow-hidden">
          <Tabs defaultValue="structure" className="h-full w-full">
            <Card className="flex h-full min-h-0 flex-col overflow-hidden border-0 bg-transparent shadow-none">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <FileDropzone
                      disabled={isBusy}
                      fileName={databaseSummary?.fileName}
                      isLoading={isBusy}
                      openRequestKey={filePickerRequestKey}
                      onFileSelect={loadDatabase}
                      onUnload={unloadDatabase}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {databaseSummary?.fileName ?? 'None'}
                      </span>
                    </div>
                    <TabsList className="w-auto flex-nowrap rounded-xl border-border/70 bg-surface/95 p-1">
                      <TabsTrigger value="structure" className="min-w-[7.5rem] px-3.5">
                        <FileCode2 className="h-3.5 w-3.5" />
                        Structure
                      </TabsTrigger>
                      <TabsTrigger value="browse" className="min-w-[7.5rem] px-3.5">
                        <FileSearch className="h-3.5 w-3.5" />
                        Browse Data
                      </TabsTrigger>
                      <TabsTrigger value="sql" className="min-w-[7.5rem] px-3.5">
                        <TerminalSquare className="h-3.5 w-3.5" />
                        Execute SQL
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground">
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
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <TabsContent value="structure" className="h-full">
                  <StructurePanel />
                </TabsContent>
                <TabsContent value="browse" className="h-full">
                  <BrowseDataPanel />
                </TabsContent>
                <TabsContent value="sql" className="h-full">
                  <ExecuteSqlPanel />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </section>
      </div>
    </main>
  )
}

export default App
