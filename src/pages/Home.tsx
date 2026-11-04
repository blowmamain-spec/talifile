import { Link } from 'react-router-dom'
import { tools } from '../tools'

export default function Home() {
  return (
    <div>
      <div className="max-w-xl pt-6 pb-4 sm:pt-10">
        <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl">
          Kerjain file &amp; gambar tanpa upload ke mana-mana.
        </h1>
        <p className="mt-3 text-ink/60">
          Remove background, compress, convert, tanda tangan, dan split PDF — semua gratis dan
          jalan langsung di browser kamu.
        </p>
      </div>

      <div className="mt-6">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.path}
            className="group -mx-4 flex items-baseline justify-between gap-6 rounded-xl px-4 py-6 transition-colors hover:bg-ink/[0.035] sm:py-7"
          >
            <div>
              <h2 className="text-xl font-medium tracking-tight sm:text-2xl">{tool.title}</h2>
              <p className="mt-1 max-w-md text-[15px] text-ink/55">{tool.description}</p>
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
