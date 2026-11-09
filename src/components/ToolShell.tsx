import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ToolIcon from './ToolIcon'
import { categoryLabels, toolById, tools, toolAccepts } from '../tools'
import { pushRecent } from '../lib/recent'
import { clearLastOutput, setCurrentTool, setNameOverride, setPendingFiles, useLastOutput, useNameOverride } from '../lib/handoff'

/** True inside Konversi File, which hosts other tools' bodies under its own header. */
export const EmbeddedContext = createContext(false)

export default function ToolShell({
  icon,
  title,
  description,
  children,
}: {
  icon: string
  title: string
  description: string
  children: ReactNode
}) {
  const tool = toolById(icon)
  const embedded = useContext(EmbeddedContext)

  useEffect(() => {
    if (embedded) return
    setCurrentTool(icon)
    clearLastOutput()
    setNameOverride('')
    if (toolById(icon)) pushRecent(icon)
  }, [icon, embedded])

  // Hosted: the host page owns the header, file name field, and "continue" panel.
  if (embedded) return <>{children}</>

  return (
    <div>
      <Link
        to="/"
        className="mb-6 inline-flex min-h-10 items-center gap-1 rounded-full text-sm text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        ← Semua tools
      </Link>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            tool?.category === 'pdf' ? 'bg-accent-500/12 text-accent-600' : 'bg-brand-500/12 text-brand-600'
          }`}
        >
          <ToolIcon id={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          {tool && <p className="text-xs font-medium text-muted">{categoryLabels[tool.category]}</p>}
          <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        </div>
      </div>
      <p className="mt-3 max-w-lg text-muted">{description}</p>
      <FileNameField />
      <div className="mt-6">{children}</div>
      <NextStep currentId={icon} />
    </div>
  )
}

/** After a download, offers the result to tools that can take it, so chains like Merge, Nomor Halaman, Kunci need no re-upload. */
function NextStep({ currentId }: { currentId: string }) {
  const output = useLastOutput()
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  if (!output || output.from !== currentId) return null
  const next = tools.filter((t) => t.id !== currentId && toolAccepts(t, output.file.type))
  if (!next.length) return null

  return (
    <section aria-label="Lanjut ke tool lain" className="mt-10 rounded-2xl bg-surface p-4 ring-1 ring-ink/10 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">Sudah didownload. Mau olah lagi?</p>
          <p className="mt-0.5 truncate text-sm text-muted">{output.file.name} langsung dipakai, tanpa upload ulang.</p>
        </div>
        <button
          type="button"
          onClick={clearLastOutput}
          aria-label="Tutup saran"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
            <path strokeLinecap="round" d="M4 4l8 8m0-8-8 8" />
          </svg>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(showAll ? next : next.slice(0, 8)).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setPendingFiles([output.file])
              navigate(t.path)
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ground px-3.5 text-sm font-medium ring-1 ring-ink/10 transition-colors hover:ring-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <ToolIcon id={t.id} className="h-4 w-4 text-muted" />
            {t.title}
          </button>
        ))}
        {!showAll && next.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-medium text-brand-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            +{next.length - 8} lainnya
          </button>
        )}
      </div>
    </section>
  )
}

/** Every download can be renamed. Left empty, tools name files automatically (original name plus what was done). */
function FileNameField() {
  const value = useNameOverride()
  const [open, setOpen] = useState(false)
  const editing = open || value !== ''

  return (
    <div className="mt-4 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className="font-medium">Nama file hasil:</span>
      {editing ? (
        <>
          <label className="sr-only" htmlFor="nama-file">Nama file hasil</label>
          <input
            id="nama-file"
            value={value}
            onChange={(e) => setNameOverride(e.target.value)}
            placeholder="mis. Surat Lamaran Budi"
            maxLength={120}
            autoComplete="off"
            autoFocus={open && value === ''}
            className="min-h-10 w-full max-w-72 rounded-lg bg-surface px-3 outline-none ring-1 ring-ink/15 focus-visible:ring-2 focus-visible:ring-brand-500 sm:w-72"
          />
          <button
            type="button"
            onClick={() => {
              setNameOverride('')
              setOpen(false)
            }}
            className="min-h-10 rounded-full px-2 text-muted underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Pakai nama otomatis
          </button>
          <span className="basis-full text-xs text-muted">Ekstensi (.pdf, .jpg, dll.) ditambahkan otomatis.</span>
        </>
      ) : (
        <>
          <span className="text-muted">Otomatis</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-10 items-center rounded-full bg-surface px-3.5 font-medium ring-1 ring-ink/15 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Ganti nama
          </button>
        </>
      )}
    </div>
  )
}
