import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryLabels, toolById } from '../tools'
import type { Tool } from '../tools'
import ToolIcon from './ToolIcon'

type FeaturedId = 'pasang-twibbon' | 'compress' | 'sign-pdf' | 'remove-background' | 'qr-code'

type FeaturedItem = {
  id: FeaturedId
  num: string
  shortLabel: string
  badge?: string
  description: string
  specs: string[]
}

const FEATURED_ITEMS: FeaturedItem[] = [
  {
    id: 'pasang-twibbon',
    num: '01',
    shortLabel: 'Twibbon',
    badge: 'Baru',
    description:
      'Pasang satu atau beberapa foto ke dalam frame twibbon PNG. Saat mengatur foto, frame otomatis jadi semi-transparan supaya posisi lebih mudah dipaskan.',
    specs: ['Lebih dari 1 foto', 'Urutan layer', 'Resolusi asli'],
  },
  {
    id: 'compress',
    num: '02',
    shortLabel: 'Compress',
    description:
      'Perkecil ukuran gambar dan PDF sampai batas KB atau MB tertentu untuk syarat upload kampus, beasiswa, atau CPNS. Bisa banyak file sekaligus.',
    specs: ['Target KB / MB', 'Gambar & PDF', 'Batch ZIP'],
  },
  {
    id: 'sign-pdf',
    num: '03',
    shortLabel: 'Sign PDF',
    description:
      'Tempel tanda tangan dan tanggal langsung di halaman PDF tanpa perlu print dan scan ulang. Bisa gambar di layar, ketik, atau upload foto TTD.',
    specs: ['Gambar / ketik / upload', 'Stempel tanggal', 'Multi halaman'],
  },
  {
    id: 'remove-background',
    num: '04',
    shortLabel: 'Remove BG',
    description:
      'Hapus latar belakang foto otomatis menjadi PNG transparan dengan model AI yang berjalan lokal di browser kamu sendiri, tanpa antre server.',
    specs: ['AI lokal', 'PNG transparan', 'Privasi penuh'],
  },
  {
    id: 'qr-code',
    num: '05',
    shortLabel: 'QR Code',
    description:
      'Buat QR code untuk link, teks, atau WiFi dengan opsi logo dan format PNG atau SVG vektor. Bisa juga membaca isi QR dari file gambar.',
    specs: ['Link, Teks, WiFi', 'Logo & SVG', 'Scan gambar'],
  },
]

function iconTint(tool: Tool) {
  if (tool.category === 'pdf') return 'bg-accent-500/12 text-accent-600'
  if (tool.category === 'gambar') return 'bg-brand-500/12 text-brand-600'
  return 'bg-ink/8 text-ink/80'
}

/** Staggered GPU-only "construct" animation for each featured tool preview. */
function ConstructPreview({ id }: { id: FeaturedId }) {
  if (id === 'pasang-twibbon') {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="c-pop checker-mini relative h-40 w-40 overflow-hidden rounded-xl ring-1 ring-ink/15">
          {/* Layer 1: Left photo slides into place */}
          <div
            className="c-left absolute left-3 top-4 h-24 w-20"
            style={{ animationDelay: '90ms' }}
          >
            <div className="animate-twibbon-nudge relative h-full w-full rounded-md bg-brand-500/25 p-1.5 ring-1 ring-dashed ring-brand-600">
              <div className="h-full w-full rounded-sm bg-brand-600/20" />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-xs bg-brand-500 ring-1 ring-white" />
              <span className="absolute -bottom-1 -left-1 h-2 w-2 rounded-xs bg-brand-500 ring-1 ring-white" />
            </div>
          </div>

          {/* Layer 2: Right photo slides into place */}
          <div
            className="c-right absolute bottom-4 right-3 h-20 w-16"
            style={{ animationDelay: '160ms' }}
          >
            <div className="h-full w-full rotate-3 rounded-md bg-accent-500/22 p-1.5 ring-1 ring-ink/15">
              <div className="h-full w-full rounded-sm bg-accent-500/20" />
            </div>
          </div>

          {/* Layer 3: Twibbon frame snaps in from outside, then peeks translucent */}
          <div
            className="c-frame pointer-events-none absolute inset-0"
            style={{ animationDelay: '220ms' }}
          >
            <div className="animate-twibbon-peek relative h-full w-full rounded-xl border-[14px] border-brand-600">
              <div className="absolute inset-x-0 bottom-0 bg-brand-600 px-2 py-1 text-center text-[9px] font-semibold tracking-wide text-on-brand">
                FRAME TWIBBON
              </div>
            </div>
          </div>
        </div>
        <p className="c-rise mt-2.5 flex items-center gap-1.5 text-[11px] tabular-nums text-muted" style={{ animationDelay: '280ms' }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
          <span>2 foto · 1080 × 1080 px</span>
        </p>
      </div>
    )
  }

  if (id === 'compress') {
    return (
      <div className="w-full max-w-68 space-y-2.5">
        <div className="c-pop rounded-xl bg-ground p-3.5 ring-1 ring-ink/10" style={{ animationDelay: '70ms' }}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">berkas-lamaran.pdf</span>
            <span
              className="c-pop shrink-0 rounded-full bg-brand-500/14 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-700"
              style={{ animationDelay: '300ms' }}
            >
              -92%
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            <div className="c-rise" style={{ animationDelay: '120ms' }}>
              <div className="flex justify-between text-[11px] tabular-nums text-muted">
                <span>Sebelum</span>
                <span>2,40 MB</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-ink/10">
                <div className="h-2 w-full rounded-full bg-ink/25" />
              </div>
            </div>
            <div className="c-rise" style={{ animationDelay: '180ms' }}>
              <div className="flex justify-between text-[11px] tabular-nums">
                <span className="font-medium text-brand-700">Sesudah</span>
                <span className="font-semibold text-brand-700">184 KB</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div className="c-shrink-bar h-2 w-full rounded-full bg-brand-500" />
              </div>
            </div>
          </div>
        </div>
        <div className="c-rise flex items-center justify-between px-1 text-[11px] text-muted" style={{ animationDelay: '260ms' }}>
          <span>Target: &lt; 200 KB</span>
          <span className="font-medium text-ink">Siap upload</span>
        </div>
      </div>
    )
  }

  if (id === 'sign-pdf') {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="c-pop relative w-48 rounded-lg bg-ground p-3.5 shadow-xs ring-1 ring-ink/12" style={{ animationDelay: '60ms' }}>
          <div className="space-y-1.5">
            <div className="c-left h-1.5 w-20 rounded-full bg-ink/20" style={{ animationDelay: '100ms' }} />
            <div className="c-left h-1.5 w-full rounded-full bg-ink/10" style={{ animationDelay: '140ms' }} />
            <div className="c-left h-1.5 w-5/6 rounded-full bg-ink/10" style={{ animationDelay: '180ms' }} />
            <div className="c-left h-1.5 w-3/4 rounded-full bg-ink/10" style={{ animationDelay: '210ms' }} />
          </div>
          <div className="mt-4 flex items-end justify-between gap-2 border-t border-dashed border-ink/12 pt-2.5">
            <div>
              <p className="c-write font-signature text-2xl leading-none text-accent-600">Nabil F.</p>
              <p className="c-rise mt-1 text-[9px] tabular-nums text-muted" style={{ animationDelay: '280ms' }}>
                24 Nov 2026
              </p>
            </div>
            <span
              className="c-pop rounded-md bg-accent-500/12 px-1.5 py-0.5 text-[9px] font-medium text-accent-600"
              style={{ animationDelay: '320ms' }}
            >
              Tertempel
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (id === 'remove-background') {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="c-pop checker-mini relative h-38 w-48 overflow-hidden rounded-xl ring-1 ring-ink/15" style={{ animationDelay: '60ms' }}>
          {/* Original background layer that gets wiped away cleanly to reveal transparency */}
          <div className="animate-cutout-bg absolute inset-0 bg-brand-500/20">
            <svg viewBox="0 0 192 152" className="h-full w-full" aria-hidden="true">
              <circle cx="148" cy="36" r="14" fill="var(--color-accent-500)" fillOpacity="0.28" />
              <path d="M0 116 L54 74 L106 112 L148 82 L192 118 L192 152 L0 152 Z" fill="var(--color-brand-600)" fillOpacity="0.26" />
            </svg>
          </div>

          {/* Foreground subject stays sharp above the transparent checkerboard */}
          <svg viewBox="0 0 120 100" className="c-rise relative z-10 h-full w-full" style={{ animationDelay: '150ms' }} aria-hidden="true">
            <circle cx="60" cy="36" r="16" fill="var(--color-ink)" fillOpacity="0.88" />
            <path d="M32 88c3-18 14-28 28-28s25 10 28 28" fill="var(--color-ink)" fillOpacity="0.88" />
          </svg>

          {/* Full-width moving scanner bar synced pixel-for-pixel with the background wipe */}
          <div className="animate-cutout-line pointer-events-none absolute inset-0 z-20">
            <span className="absolute inset-y-0 right-0 block w-0.5 bg-brand-500 shadow-[0_0_10px_var(--color-brand-500)]" />
          </div>

          <span
            className="c-pop absolute bottom-2 left-2 z-20 rounded bg-surface/90 px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-ink/10"
            style={{ animationDelay: '240ms' }}
          >
            Asli
          </span>
          <span
            className="c-pop absolute bottom-2 right-2 z-20 rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-medium text-on-brand"
            style={{ animationDelay: '290ms' }}
          >
            PNG
          </span>
        </div>
      </div>
    )
  }

  // qr-code: grouped cells construct in 3 quick waves
  const matrix = [
    1, 1, 1, 0, 1, 0, 1, 1, 1,
    1, 0, 1, 0, 0, 1, 1, 0, 1,
    1, 1, 1, 0, 1, 0, 1, 1, 1,
    0, 0, 0, 1, 0, 1, 0, 0, 0,
    1, 0, 1, 1, 1, 0, 1, 0, 1,
    0, 1, 0, 0, 1, 1, 0, 1, 0,
    1, 1, 1, 0, 1, 0, 1, 0, 1,
    1, 0, 1, 1, 0, 1, 0, 1, 0,
    1, 1, 1, 0, 1, 0, 1, 1, 1,
  ]

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="c-pop rounded-xl bg-white p-3 ring-1 ring-ink/15" style={{ animationDelay: '60ms' }}>
        <div className="grid grid-cols-9 gap-1">
          {matrix.map((cell, i) => {
            const wave = (Math.floor(i / 9) + (i % 9)) % 4
            return (
              <span
                key={i}
                className={`block h-2.5 w-2.5 rounded-[2px] ${cell ? 'c-pop bg-[#16140f]' : 'bg-transparent'}`}
                style={cell ? { animationDelay: `${90 + wave * 55}ms` } : undefined}
              />
            )
          })}
        </div>
      </div>
      <p className="c-rise mt-2.5 text-[11px] text-muted" style={{ animationDelay: '280ms' }}>
        PNG, SVG vektor, atau scan gambar
      </p>
    </div>
  )
}

export default function FeaturedTools({ externalPaused = false }: { externalPaused?: boolean }) {
  const entries = FEATURED_ITEMS.map((item) => {
    const tool = toolById(item.id)
    return tool ? { item, tool } : null
  }).filter((x): x is { item: FeaturedItem; tool: Tool } => x !== null)

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const isPaused = paused || externalPaused

  const count = entries.length
  const safeIndex = index % Math.max(1, count)
  const current = entries[safeIndex]

  if (!current) return null

  function prev() {
    setIndex((i) => (i - 1 + count) % count)
  }

  function next() {
    setIndex((i) => (i + 1) % count)
  }

  return (
    <section
      aria-labelledby="judul-unggulan"
      aria-roledescription="carousel"
      className="mb-10 sm:mb-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false)
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
        touchStartX.current = null
        if (Math.abs(dx) > 42) {
          if (dx < 0) next()
          else prev()
        }
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="judul-unggulan" className="text-sm font-semibold text-muted">
          Tool unggulan
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 font-mono text-xs tabular-nums text-muted">
            {current.item.num} / 0{count}
          </span>
          <button
            type="button"
            onClick={prev}
            aria-label="Slide sebelumnya"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-sm text-muted ring-1 ring-ink/10 transition-colors hover:text-ink hover:ring-ink/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            ←
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Slide berikutnya"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-sm text-muted ring-1 ring-ink/10 transition-colors hover:text-ink hover:ring-ink/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            →
          </button>
        </div>
      </div>

      {/* Main slide stage */}
      <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/10">
        <div
          key={current.item.id}
          className="grid gap-6 p-5 sm:p-7 md:min-h-[21rem] md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-center md:gap-8"
        >
          {/* Left column: Tool name, brief description, and key capabilities */}
          <div className="flex flex-col justify-center">
            <div className="c-rise flex items-center gap-2.5" style={{ animationDelay: '0ms' }}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconTint(current.tool)}`}>
                <ToolIcon id={current.tool.id} className="h-4.5 w-4.5" />
              </span>
              <span className="text-xs font-medium text-muted">{categoryLabels[current.tool.category]}</span>
              {current.item.badge && (
                <span className="rounded-full bg-accent-500/14 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-600">
                  {current.item.badge}
                </span>
              )}
            </div>

            <h3
              className="c-rise mt-4 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
              style={{ animationDelay: '60ms' }}
            >
              {current.tool.title}
            </h3>

            <p
              className="c-rise mt-2.5 max-w-md text-sm leading-relaxed text-muted sm:text-[15px]"
              style={{ animationDelay: '120ms' }}
            >
              {current.item.description}
            </p>

            <div className="c-rise mt-4 flex flex-wrap gap-1.5" style={{ animationDelay: '180ms' }}>
              {current.item.specs.map((spec) => (
                <span
                  key={spec}
                  className="rounded-md bg-ground px-2.5 py-1 text-xs font-medium text-ink/80 ring-1 ring-ink/8"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          {/* Right column: Animated construct preview + direct CTA button right below it */}
          <div className="flex flex-col items-stretch gap-3.5">
            <div className="flex min-h-48 items-center justify-center rounded-xl bg-ground/70 px-4 py-4 ring-1 ring-ink/8">
              <ConstructPreview id={current.item.id} />
            </div>

            <Link
              to={current.tool.path}
              className="c-rise inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              style={{ animationDelay: '240ms' }}
            >
              Buka {current.tool.title}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Bottom slide selector bar with lightweight CSS timer */}
        <div
          role="tablist"
          aria-label="Pilih tool unggulan"
          className="grid grid-cols-5 border-t border-ink/8 bg-ground/40"
        >
          {entries.map(({ item }, i) => {
            const active = i === safeIndex
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setIndex(i)}
                className={`relative flex min-h-11 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 ${
                  active ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                <span className="font-mono text-[10px] tabular-nums opacity-70 sm:hidden">{item.num}</span>
                <span className="hidden truncate text-xs font-medium sm:inline">
                  <span className="mr-1 font-mono text-[11px] tabular-nums opacity-60">{item.num}</span>
                  {item.shortLabel}
                </span>
                <span className="sr-only sm:hidden">{item.shortLabel}</span>

                {/* Thin top progress track on the active tab; drives slide advance on completion */}
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-transparent">
                  {active && (
                    <span
                      key={`${item.id}-${safeIndex}`}
                      onAnimationEnd={() => {
                        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) next()
                      }}
                      className="animate-slide-progress block h-full w-full bg-brand-500"
                      style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
                    />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
