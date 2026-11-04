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

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.path}
            className="group flex flex-col gap-3 rounded-xl bg-ink/[0.035] p-4 transition-colors hover:bg-ink/[0.06] sm:p-5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/[0.05] text-ink/60 transition-colors group-hover:bg-brand-500/10 group-hover:text-brand-600">
              <ToolIcon id={tool.id} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 text-[15px] font-medium tracking-tight sm:text-base">
                {tool.title}
                <span
                  aria-hidden="true"
                  className="text-ink/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-500"
                >
                  →
                </span>
              </h2>
              <p className="mt-1 text-[13px] leading-snug text-ink/55 sm:text-sm">{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
