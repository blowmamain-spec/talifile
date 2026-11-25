import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { categoryLabels, toolById, tools } from '../tools'
import type { Tool } from '../tools'
import { searchTools } from '../lib/search'
import { readRecent } from '../lib/recent'
import ToolIcon from './ToolIcon'

const POPULAR_IDS = ['pasang-twibbon', 'compress', 'sign-pdf', 'remove-background', 'qr-code', 'konversi']

function iconTint(tool: Tool) {
  if (tool.category === 'pdf') return 'bg-accent-500/12 text-accent-600'
  if (tool.category === 'gambar') return 'bg-brand-500/12 text-brand-600'
  return 'bg-ink/8 text-ink/80'
}

export default function QuickSwitcher() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [recentTools, setRecentTools] = useState<Tool[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function openModal() {
    setRecentTools(readRecent().map(toolById).filter((t): t is Tool => Boolean(t)))
    setQuery('')
    setActiveIdx(0)
    setOpen(true)
  }

  // Global Ctrl+K / Cmd+K shortcut from any page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((wasOpen) => {
          if (wasOpen) return false
          setRecentTools(readRecent().map(toolById).filter((t): t is Tool => Boolean(t)))
          setQuery('')
          setActiveIdx(0)
          return true
        })
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus input when opened.
  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])

  const trimmed = query.trim()
  const items = useMemo(() => {
    if (trimmed) return searchTools(tools, trimmed).hits.map((h) => h.tool).slice(0, 8)
    const seen = new Set<string>()
    const combined: Tool[] = []
    for (const t of recentTools) {
      if (!seen.has(t.id)) {
        seen.add(t.id)
        combined.push(t)
      }
    }
    for (const id of POPULAR_IDS) {
      const t = toolById(id)
      if (t && !seen.has(t.id)) {
        seen.add(t.id)
        combined.push(t)
      }
    }
    return combined.slice(0, 7)
  }, [trimmed, recentTools])

  const safeIdx = items.length ? Math.min(activeIdx, items.length - 1) : 0

  function selectTool(tool: Tool) {
    setOpen(false)
    if (tool.path !== pathname) navigate(tool.path)
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Cari tool cepat (Ctrl+K)"
        title="Cari tool cepat (Ctrl+K)"
        className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-surface px-3 text-sm text-muted ring-1 ring-ink/12 transition-colors hover:text-ink hover:ring-ink/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
          <circle cx="9" cy="9" r="5.5" />
          <path strokeLinecap="round" d="m13.5 13.5 3.5 3.5" />
        </svg>
        <span className="hidden sm:inline">Cari</span>
        <kbd className="hidden rounded bg-ground px-1.5 py-0.5 font-mono text-[10px] text-muted ring-1 ring-ink/12 sm:inline">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pindah cepat ke tool lain"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pt-[12vh] backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="c-rise w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-ink/15"
          >
            <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5 shrink-0 text-muted">
                <circle cx="9" cy="9" r="5.5" />
                <path strokeLinecap="round" d="m13.5 13.5 3.5 3.5" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIdx(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' && items.length) {
                    e.preventDefault()
                    setActiveIdx((i) => (i + 1) % items.length)
                  } else if (e.key === 'ArrowUp' && items.length) {
                    e.preventDefault()
                    setActiveIdx((i) => (i - 1 + items.length) % items.length)
                  } else if (e.key === 'Enter' && items[safeIdx]) {
                    e.preventDefault()
                    selectTool(items[safeIdx])
                  }
                }}
                placeholder="Loncat ke tool: twibbon, kompres, ttd, pdf ke word…"
                autoComplete="off"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted sm:text-base"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-ground px-2 py-1 font-mono text-[11px] text-muted ring-1 ring-ink/12 hover:text-ink"
              >
                Esc
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              <p className="px-2.5 py-1.5 text-[11px] font-semibold text-muted">
                {trimmed ? `Hasil (${items.length})` : recentTools.length ? 'Terakhir dipakai & populer' : 'Tool populer'}
              </p>

              {!items.length ? (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  Tidak ada tool yang cocok untuk "{query}".
                </p>
              ) : (
                <ul role="listbox" aria-label="Daftar tool">
                  {items.map((tool, i) => {
                    const active = i === safeIdx
                    const isCurrent = tool.path === pathname
                    return (
                      <li key={tool.id} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIdx(i)}
                          onClick={() => selectTool(tool)}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                            active ? 'bg-ground text-ink' : 'text-ink/85 hover:bg-ground/60'
                          }`}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconTint(tool)}`}>
                            <ToolIcon id={tool.id} className="h-4.5 w-4.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-display text-sm font-semibold">{tool.title}</span>
                              {isCurrent && (
                                <span className="rounded-full bg-brand-500/12 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                                  Sedang dibuka
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-xs text-muted">{tool.description}</span>
                          </span>
                          <span className="hidden shrink-0 text-[11px] text-muted sm:inline">
                            {categoryLabels[tool.category]}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="hidden items-center justify-between border-t border-ink/8 bg-ground/50 px-4 py-2 text-[11px] text-muted sm:flex">
              <span>↑↓ pilih · Enter buka · Esc tutup</span>
              <span>{tools.length} tools lokal di browser</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
