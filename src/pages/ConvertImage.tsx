import { useState } from 'react'
import ToolShell from '../components/ToolShell'
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

  function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setFormat(f.type === 'image/png' ? 'image/webp' : 'image/png')
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
      description="Ubah PNG, JPG, atau WebP ke format lain langsung di browser."
    >
      {!file && (
        <Dropzone
          accept="image/png,image/jpeg,image/webp"
          onFiles={handleFiles}
          label="Klik atau drop gambar di sini"
          hint="JPG, PNG, atau WebP"
        />
      )}

      {file && (
        <div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-ink/[0.03] px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm tabular-nums text-ink/50">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setResult(null)
              }}
              className="shrink-0 rounded-full bg-ink/5 px-4 py-1.5 text-sm text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
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
                <span className="tabular-nums text-ink/50">{Math.round(quality * 100)}%</span>
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
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Mengonversi…' : `Convert ke ${formats.find((f) => f.value === format)!.label}`}
          </button>

          {result && (
            <div className="mt-6 rounded-xl bg-ink/[0.03] p-4" aria-live="polite">
              <img src={result.url} alt="Hasil konversi" className="max-h-72 rounded-lg" />
              <p className="mt-3 text-sm tabular-nums text-ink/60">{formatBytes(result.size)}</p>
              <a
                href={result.url}
                download={`${file.name.replace(/\.[^.]+$/, '')}.${ext}`}
                className="mt-3 inline-block rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
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
