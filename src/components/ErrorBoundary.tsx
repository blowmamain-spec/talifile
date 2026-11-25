import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; isChunkError: boolean }

const CHUNK_RELOAD_KEY = 'talifile:chunk-reload'

function looksLikeChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically imported module/i.test(
    msg,
  )
}

/**
 * Catches runtime crashes and stale lazy-chunk errors after a fresh Vercel deployment.
 * Auto-reloads once on stale chunk errors so returning visitors seamlessly get the new bundle.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, isChunkError: looksLikeChunkError(error) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[TaliFile] Unhandled UI error:', error, info)
    if (looksLikeChunkError(error)) {
      try {
        if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          window.location.reload()
        }
      } catch {
        // storage unavailable: fall back to the manual reload button below
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {this.state.isChunkError ? 'Versi baru TaliFile tersedia' : 'Terjadi kendala saat memuat halaman'}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">
          {this.state.isChunkError
            ? 'Aplikasi baru saja diperbarui. Muat ulang halaman ini supaya file aplikasi terbaru terambil dengan benar.'
            : 'Halaman ini mengalami gangguan tak terduga. Coba muat ulang halaman atau kembali ke beranda.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(CHUNK_RELOAD_KEY)
              } catch {
                // ignore
              }
              window.location.reload()
            }}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Muat ulang halaman
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-full bg-surface px-5 text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Ke beranda
          </a>
        </div>
      </div>
    )
  }
}
