import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { offerFromUrl } from '../lib/handoff'
import Dropzone from '../components/Dropzone'
import { formatBytes } from '../lib/format'

type Format = 'image/png' | 'image/jpeg' | 'image/webp'

const formats: { value: Format; label: string; ext: string }[] = [
  { value: 'image/png', label: 'PNG', ext: 'png' },
  { value: 'image/jpeg', label: 'JPG', ext: 'jpg' },
  { value: 'image/webp', label: 'WebP', ext: 'webp' },
]

export default function ConvertImage() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<Format>('image/png')
  const [quality, setQuality] = useState(0.9)
  const [working, setWorking] = useState(false)
  const [result, setResult] = useState<{ url: string; size: number } | null>(null)
  const [heicStatus, setHeicStatus] = useState('')

  async function handleFiles(files: File[]) {
    let f = files[0]
    if (!f) return
    setResult(null)
    setHeicStatus('')
    // iPhone photos: browsers outside Safari cannot decode HEIC, so it is decoded here first (lazy-loaded, CSP-safe build).
    const isHeic = /image\/hei[cf]/.test(f.type) || /\.hei[cf]$/i.test(f.name)
    if (isHeic) {
      setHeicStatus('Membaca foto HEIC…')
      try {
        const { heicTo } = await import('heic-to/csp')
        const png = await heicTo({ blob: f, type: 'image/png' })
        f = new File([png], f.name.replace(/\.hei[cf]$/i, '.png'), { type: 'image/png' })
        setHeicStatus('')
      } catch (err) {
        console.error(err)
        setHeicStatus('Foto HEIC ini tidak bisa dibaca. Coba ekspor ulang dari Galeri sebagai JPG.')
        return
      }
    }
    setFile(f)
    setFormat(isHeic ? 'image/jpeg' : f.type === 'image/png' ? 'image/webp' : 'image/png')
  }

  async function convert() {
    if (!file) return
    setWorking(true)
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')!
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(bitmap, 0, 0)
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b!), format, quality),
      )
      setResult({ url: URL.createObjectURL(blob), size: blob.size })
    } finally {
      setWorking(false)
    }
  }

  const needsQuality = format !== 'image/png'
  const ext = formats.find((f) => f.value === format)!.ext

  return (
    <ToolShell
      icon="convert-image"
      title="Convert Format Gambar"
      description="Ubah PNG, JPG, WebP, atau foto HEIC dari iPhone ke format lain langsung di browser."
    >
      {!file && (
        <Dropzone
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
          onFiles={handleFiles}
          label="Klik atau drop gambar di sini"
          hint="JPG, PNG, WebP, atau HEIC dari iPhone"
        />
      )}

      {heicStatus && (
        <p className="mt-4 text-sm text-muted" role="status">
          {heicStatus}
        </p>
      )}

      {file && (
        <div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface ring-1 ring-ink/10 px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm tabular-nums text-muted">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setResult(null)
              }}
              className="shrink-0 inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Ganti gambar
            </button>
          </div>

          <fieldset className="mt-6 flex flex-wrap gap-2">
            <legend className="mb-2 text-sm font-medium">Format output</legend>
            {formats.map((f) => (
              <label
                key={f.value}
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  format === f.value
                    ? 'bg-brand-500/10 text-brand-700 ring-1 ring-brand-500'
                    : 'bg-ink/5 text-ink/65 hover:bg-ink/10'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={f.value}
                  checked={format === f.value}
                  onChange={() => setFormat(f.value)}
                  className="sr-only"
                />
                {f.label}
              </label>
            ))}
          </fieldset>

          {needsQuality && (
            <div className="mt-5">
              <label className="flex items-center justify-between text-sm">
                <span>Kualitas</span>
                <span className="tabular-nums text-muted">{Math.round(quality * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-2 w-full accent-brand-500"
              />
            </div>
          )}

          <button
            type="button"
            onClick={convert}
            disabled={working}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Mengonversi…' : `Convert ke ${formats.find((f) => f.value === format)!.label}`}
          </button>

          {result && (
            <div className="mt-6 rounded-xl bg-surface ring-1 ring-ink/10 p-4" aria-live="polite">
              <img src={result.url} alt="Hasil konversi" className="max-h-72 rounded-lg" />
              <p className="mt-3 text-sm tabular-nums text-muted">{formatBytes(result.size)}</p>
              <a
                href={result.url}
                download={`${file.name.replace(/\.[^.]+$/, '')}.${ext}`}
                onClick={() => offerFromUrl(result.url, `${file.name.replace(/\.[^.]+$/, '')}.${ext}`)}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Download
              </a>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  )
}
