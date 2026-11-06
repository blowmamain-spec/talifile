import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { clearLastOutput, takePendingFiles } from '../lib/handoff'

function matches(file: File, accept: string) {
  return accept.split(',').some((a) => {
    const rule = a.trim()
    if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1))
    return file.type === rule || (rule.startsWith('.') && file.name.toLowerCase().endsWith(rule))
  })
}

export default function Dropzone({
  accept,
  multiple = false,
  onFiles,
  label,
  hint,
  compact = false,
}: {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label: string
  hint?: string
  /** Smaller variant for "add more" once files are already loaded. */
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onFilesRef = useRef(onFiles)
  const [dragOver, setDragOver] = useState(false)
  const [rejected, setRejected] = useState('')

  // A new file makes the previous result's "continue with..." offer stale.
  useEffect(() => {
    onFilesRef.current = (files: File[]) => {
      clearLastOutput()
      onFiles(files)
    }
  })

  function filterAccepted(files: File[]) {
    const ok = files.filter((f) => matches(f, accept))
    setRejected(ok.length < files.length ? 'Sebagian file dilewati karena formatnya tidak didukung tool ini.' : '')
    return multiple ? ok : ok.slice(0, 1)
  }

  // Files handed over from another tool or the share sheet arrive here on mount.
  useEffect(() => {
    const files = takePendingFiles(accept)
    if (files) onFilesRef.current(multiple ? files : files.slice(0, 1))
  }, [accept, multiple])

  // Ctrl+V a screenshot or copied file straight into the tool.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (!files.length) return
      e.preventDefault()
      const ok = filterAccepted(files)
      if (ok.length) onFilesRef.current(ok)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  function handleDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setDragOver(false)
    const ok = filterAccepted(Array.from(e.dataTransfer.files))
    if (ok.length) onFilesRef.current(ok)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex w-full items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 ${
          compact ? 'gap-3 px-4 py-4' : 'flex-col px-6 py-12'
        } ${dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-ink/15 bg-surface hover:border-brand-400'}`}
      >
        <span
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 ${compact ? 'h-9 w-9' : 'h-12 w-12'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={compact ? 'h-4 w-4' : 'h-5 w-5'}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0 4 4m-4-4-4 4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
        </span>
        <span className={compact ? 'text-left' : 'mt-4'}>
          <span className="block font-medium">{label}</span>
          {!compact && (
            <span className="mt-1 block text-sm text-muted">
              {hint ? `${hint}. ` : ''}Bisa juga drop file atau tempel (Ctrl+V).
            </span>
          )}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          tabIndex={-1}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) onFilesRef.current(files)
            e.target.value = ''
          }}
        />
      </button>
      {rejected && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {rejected}
        </p>
      )}
    </div>
  )
}
