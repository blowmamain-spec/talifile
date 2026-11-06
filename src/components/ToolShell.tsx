import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ToolIcon from './ToolIcon'
import { categoryLabels, toolById, tools, toolAccepts } from '../tools'
import { pushRecent } from '../lib/recent'
import { clearLastOutput, setCurrentTool, setPendingFiles, useLastOutput } from '../lib/handoff'

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

  useEffect(() => {
    setCurrentTool(icon)
    clearLastOutput()
    if (toolById(icon)) pushRecent(icon)
  }, [icon])

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
      <div className="mt-8">{children}</div>
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
