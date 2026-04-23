import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'

type FileDropzoneProps = {
  disabled?: boolean
  fileName?: string
  isLoading?: boolean
  openRequestKey?: number
  onFileSelect: (file: File) => void | Promise<void>
  onUnload?: () => void
}

export function FileDropzone({
  disabled = false,
  fileName,
  isLoading = false,
  openRequestKey,
  onFileSelect,
  onUnload,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const lastHandledRequestKeyRef = useRef<number | null>(null)

  useEffect(() => {
    if (
      !openRequestKey ||
      disabled ||
      lastHandledRequestKeyRef.current === openRequestKey
    ) {
      return
    }

    lastHandledRequestKeyRef.current = openRequestKey
    inputRef.current?.click()
  }, [disabled, openRequestKey])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {isLoading ? 'Opening...' : 'Browse'}
      </Button>
      {fileName ? (
        <Button type="button" variant="ghost" size="sm" onClick={onUnload}>
          <X className="h-4 w-4" />
          Unload
        </Button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void onFileSelect(file)
          }

          event.target.value = ''
        }}
      />
    </div>
  )
}
