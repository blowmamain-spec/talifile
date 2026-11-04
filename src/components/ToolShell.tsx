import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export default function ToolShell({
  title,
  description,
  children,
}: {
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
      <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1.5 max-w-lg text-ink/60">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  )
}
