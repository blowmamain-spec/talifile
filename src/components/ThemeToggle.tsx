import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'

const order: Theme[] = ['system', 'light', 'dark']
const labels: Record<Theme, string> = {
  system: 'Ikut sistem',
  light: 'Mode terang',
  dark: 'Mode gelap',
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  function cycle() {
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Tema: ${labels[theme]}. Klik untuk ganti.`}
      title={labels[theme]}
      className="rounded-full p-2 text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      {theme === 'light' && <SunIcon />}
      {theme === 'dark' && <MoonIcon />}
      {theme === 'system' && <SystemIcon />}
    </button>
  )
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4">
      <circle cx="8" cy="8" r="3" />
      <path strokeLinecap="round" d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.9 3.1l-1.1 1.1M4.2 11.7l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
      <path d="M13.8 9.9A5.8 5.8 0 0 1 6.1 2.2a6 6 0 1 0 7.7 7.7Z" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4">
      <rect x="1.5" y="2.5" width="13" height="8.5" rx="1" />
      <path strokeLinecap="round" d="M5.5 14h5M8 11v3" />
    </svg>
  )
}
