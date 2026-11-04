import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ToolIcon from './ToolIcon'

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
  return (
    <div>
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink/50 transition-colors hover:text-ink"
      >
        ← Semua tools
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
          <ToolIcon id={icon} className="h-5 w-5" />
        </span>
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      </div>
      <p className="mt-2 max-w-lg text-ink/60">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  )
}
