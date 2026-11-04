import { Link, NavLink, Outlet } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          FileKit
        </Link>
        <div className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 text-sm transition-colors ${
                isActive ? 'text-ink' : 'text-ink/50 hover:text-ink'
              }`
            }
          >
            Semua tools
          </NavLink>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16 sm:px-8">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-4xl px-5 pb-10 text-sm text-ink/45 sm:px-8">
        Semua proses jalan di browser kamu sendiri. File tidak pernah diupload ke server.
      </footer>
    </div>
  )
}
