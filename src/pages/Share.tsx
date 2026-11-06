import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ToolIcon from '../components/ToolIcon'
import { tools, toolAccepts } from '../tools'
import { setPendingFiles } from '../lib/handoff'
import { formatBytes } from '../lib/format'

const CACHE = 'share-target'

/** Reads files the service worker stashed from the Android share sheet, then lets the user pick a tool. */
async function readShared(): Promise<File[]> {
  if (!('caches' in window)) return []
  const cache = await caches.open(CACHE)
  const keys = await cache.keys()
  const files: File[] = []
  for (const req of keys) {
    const res = await cache.match(req)
    if (!res) continue
    const blob = await res.blob()
    const name = decodeURIComponent(res.headers.get('x-file-name') ?? 'file')
    files.push(new File([blob], name, { type: blob.type }))
    await cache.delete(req)
  }
  return files
}

export default function Share() {
  const [files, setFiles] = useState<File[] | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    readShared().then(setFiles).catch(() => setFiles([]))
  }, [])

  if (files === null) return <p className="py-16 text-center text-sm text-muted">Membuka file yang dibagikan…</p>

  if (files.length === 0)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Tidak ada file yang diterima</h1>
        <p className="mt-2 text-muted">Bagikan foto atau PDF dari galeri atau file manager ke TaliFile, lalu pilih tool di sini.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          Ke semua tools
        </button>
      </div>
    )

  const type = files[0].type
  const options = tools.filter((t) => toolAccepts(t, type))

  return (
    <div className="pt-4">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mau diapakan?</h1>
      <p className="mt-2 text-muted">
        {files.length === 1 ? files[0].name : `${files.length} file`} ({formatBytes(files.reduce((n, f) => n + f.size, 0))})
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {options.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => {
                setPendingFiles(files)
                navigate(t.path)
              }}
              className="flex h-full w-full flex-col gap-2 rounded-2xl bg-surface p-4 text-left ring-1 ring-ink/10 hover:ring-ink/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <ToolIcon id={t.id} className="h-5 w-5 text-brand-600" />
              <span className="font-display font-semibold">{t.title}</span>
              <span className="text-sm text-muted">{t.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
