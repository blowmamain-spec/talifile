import { Link } from 'react-router-dom'
import { tools } from '../tools'
import ToolIcon from '../components/ToolIcon'

export default function Home() {
  const stats = [`${tools.length} tools`, '100% di browser', 'Gratis, tanpa akun']

  return (
    <div>
      <div className="max-w-xl pt-6 pb-4 sm:pt-10">
        <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl">
          Kerjain file &amp; gambar tanpa upload ke mana-mana.
        </h1>
        <p className="mt-3 text-ink/60">
          Remove background, compress, convert, tanda tangan, sampai split PDF. Semua gratis dan
          jalan langsung di browser kamu.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {stats.map((s) => (
            <span
              key={s}
              className="rounded-full bg-ink/[0.045] px-3 py-1 text-xs font-medium tabular-nums text-ink/60"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.path}
            className="group -mx-4 flex items-center gap-4 rounded-xl px-4 py-5 transition-colors hover:bg-ink/[0.035] sm:gap-5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/[0.045] text-ink/60 transition-colors group-hover:bg-brand-500/10 group-hover:text-brand-600">
              <ToolIcon id={tool.id} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-medium tracking-tight sm:text-xl">{tool.title}</h2>
              <p className="mt-0.5 max-w-md text-[15px] text-ink/55">{tool.description}</p>
            </div>
            <span
              aria-hidden="true"
              className="shrink-0 text-ink/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-500"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
