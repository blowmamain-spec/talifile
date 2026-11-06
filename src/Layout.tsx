import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import ThemeToggle from './components/ThemeToggle'
import Rope from './components/Rope'
import { tools } from './tools'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-full px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
    isActive ? 'text-ink' : 'text-muted hover:text-ink'
  }`

export default function Layout() {
  const { pathname } = useLocation()

  // Each tool is its own page: start it at the top, with its own tab title and canonical URL.
  useEffect(() => {
    window.scrollTo(0, 0)
    const tool = tools.find((t) => t.path === pathname)
    const named: Record<string, string> = { '/tentang': 'Tentang', '/privasi': 'Privasi' }
    const title = tool?.title ?? named[pathname]
    document.title = title ? `${title} · TaliFile` : 'TaliFile: Toolkit File & Gambar'
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://talifile.nfab.my.id${pathname}`)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:ring-2 focus:ring-brand-500"
      >
        Lewati ke konten
      </a>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-8">
        <Link
          to="/"
          className="rounded-md font-display text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
        >
          Tali<span className="text-accent-600">File</span>
        </Link>
        <nav aria-label="Navigasi utama" className="flex items-center gap-0.5">
          <NavLink to="/" end className={navClass}>
            Semua tools
          </NavLink>
          <NavLink to="/tentang" className={navClass}>
            Tentang
          </NavLink>
          <ThemeToggle />
        </nav>
      </header>

      <main id="konten" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-8">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-8">
        <Rope className="h-4 w-full max-w-xs" />
        <div className="mt-5 flex flex-col gap-4 text-sm text-muted sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md space-y-1.5">
            <p>Semua proses jalan di browser kamu sendiri. File tidak pernah diupload ke server.</p>
            <p>
              Dibuat oleh{' '}
              <a
                href="https://github.com/blowmamain-spec"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink underline decoration-accent-500 decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                NabF12
              </a>{' '}
              pakai Claude Code.
            </p>
          </div>
          <nav aria-label="Tautan footer" className="flex gap-4">
            <Link to="/tentang" className="hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
              Tentang
            </Link>
            <Link to="/privasi" className="hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
              Privasi
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
