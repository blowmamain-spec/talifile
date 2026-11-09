import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryLabels, toolById, tools } from '../tools'
import type { Category, Tool } from '../tools'
import ToolIcon from '../components/ToolIcon'
import Rope from '../components/Rope'
import { readRecent } from '../lib/recent'

type Filter = 'semua' | Category

// Category tint lives on the icon only: green for images, pink for PDF, so the grid reads in two calm colors, never as a rainbow.
function iconTint(tool: Tool) {
  if (tool.category === 'pdf') return 'bg-accent-500/12 text-accent-600'
  if (tool.category === 'gambar') return 'bg-brand-500/12 text-brand-600'
  return 'bg-ink/8 text-ink/80'
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('semua')
  const [recent] = useState(() => readRecent().map(toolById).filter((t): t is Tool => !!t))
  const searchRef = useRef<HTMLInputElement>(null)

  // "/" jumps to search, the habit from most search-first sites.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    return tools.filter((t) => {
      if (filter !== 'semua' && t.category !== filter) return false
      const hay = normalize(`${t.title} ${t.description} ${t.keywords}`)
      return words.every((w) => hay.includes(w))
    })
  }, [query, filter])

  const counts: Record<Filter, number> = {
    semua: tools.length,
    gambar: tools.filter((t) => t.category === 'gambar').length,
    pdf: tools.filter((t) => t.category === 'pdf').length,
    lainnya: tools.filter((t) => t.category === 'lainnya').length,
  }

  return (
    <div>
      <section className="pt-2 pb-6 sm:pt-10 sm:pb-8">
        <h1 className="max-w-2xl text-balance text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-5xl">
          Kerjain file &amp; gambar{' '}
          <span className="relative inline-block whitespace-nowrap">
            tanpa upload
            <Rope className="absolute -bottom-2 left-0 h-3 w-full sm:-bottom-3 sm:h-4" />
          </span>{' '}
          ke mana-mana.
        </h1>
        <p className="mt-5 max-w-xl text-muted sm:text-lg">
          {tools.length} tools untuk gambar, PDF, dan dokumen Word. Semuanya jalan di browser kamu, gratis, tanpa akun.
        </p>

        <div className="mt-7 max-w-xl">
          <label htmlFor="cari-tool" className="sr-only">
            Cari tool
          </label>
          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path strokeLinecap="round" d="m13.5 13.5 3.5 3.5" />
            </svg>
            <input
              ref={searchRef}
              id="cari-tool"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari: kompres, ttd, pas foto"
              autoComplete="off"
              className="h-13 w-full rounded-2xl bg-surface pl-12 pr-12 text-base outline-none ring-1 ring-ink/15 transition-shadow placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md px-2 py-0.5 text-xs text-muted ring-1 ring-ink/15 sm:block">
              /
            </kbd>
          </div>
        </div>
      </section>

      {recent.length > 0 && !query && (
        <section aria-labelledby="judul-terakhir" className="mb-6 sm:mb-8">
          <h2 id="judul-terakhir" className="mb-3 text-sm font-semibold text-muted">
            Terakhir dipakai
          </h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {recent.map((t) => (
              <Link
                key={t.id}
                to={t.path}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-surface pl-2 pr-4 text-sm font-medium ring-1 ring-ink/10 transition-colors hover:ring-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${iconTint(t)}`}>
                  <ToolIcon id={t.id} className="h-4 w-4" />
                </span>
                {t.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div role="group" aria-label="Filter kategori" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {(['semua', 'gambar', 'pdf', 'lainnya'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
              filter === f ? 'bg-ink text-ground' : 'bg-surface text-ink/75 ring-1 ring-ink/10 hover:text-ink'
            }`}
          >
            {f === 'semua' ? 'Semua' : categoryLabels[f]}
            <span className={`tabular-nums ${filter === f ? 'opacity-70' : 'text-muted'}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-surface px-6 py-12 text-center ring-1 ring-ink/10">
          <p className="font-medium">Belum ada tool untuk "{query}".</p>
          <p className="mt-1 text-sm text-muted">Coba kata lain, misal "gabung", "kecilin", atau "tanda tangan".</p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setFilter('semua')
            }}
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-surface px-5 text-sm font-medium ring-1 ring-ink/15 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Tampilkan semua tool
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {visible.map((tool) => (
            <li key={tool.id}>
              <Link
                to={tool.path}
                className="group flex h-full flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-ink/8 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:ring-ink/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:p-5"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTint(tool)}`}>
                  <ToolIcon id={tool.id} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[15px] font-semibold leading-snug tracking-tight sm:text-base">
                    {tool.title}
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-muted sm:text-sm">{tool.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
