import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { formatBytes } from '../lib/format'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function RemoveBackground() {
  const [original, setOriginal] = useState<{ url: string; file: File } | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultSize, setResultSize] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')

  async function handleFiles(files: File[]) {
    const file = files[0]
    if (!file) return
    setOriginal({ url: URL.createObjectURL(file), file })
    setResultUrl(null)
    setError('')
    setStatus('loading')
    setProgressLabel('Menyiapkan model…')
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          setProgressLabel(
            key.startsWith('fetch')
              ? `Mengunduh model… ${Math.round((current / total) * 100)}%`
              : `Memproses gambar… ${Math.round((current / total) * 100)}%`,
          )
        },
      })
      setResultUrl(URL.createObjectURL(blob))
      setResultSize(blob.size)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setError('Gagal menghapus background. Coba gambar lain atau refresh halaman.')
      setStatus('error')
    }
  }

  function reset() {
    setOriginal(null)
    setResultUrl(null)
    setStatus('idle')
    setError('')
  }

  return (
    <ToolShell
      title="Remove Background"
      description="Upload gambar, background dihapus otomatis langsung di browser. Model AI diunduh sekali saat pertama dipakai (~80 MB)."
    >
      {!original && (
        <Dropzone
          accept="image/*"
          onFiles={handleFiles}
          label="Klik atau drop gambar di sini"
          hint="JPG, PNG, atau WebP"
        />
      )}

      {original && (
        <div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink/55">Original</p>
              <div className="overflow-hidden rounded-xl bg-[conic-gradient(#0000000d_0_25%,#0000_0_50%)] bg-[length:20px_20px] ring-1 ring-ink/10">
                <img src={original.url} alt="Gambar asli sebelum diproses" className="w-full object-contain" />
              </div>
              <p className="mt-1 text-xs tabular-nums text-ink/45">{formatBytes(original.file.size)}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink/55">Hasil</p>
              <div
                className="flex min-h-[160px] items-center justify-center overflow-hidden rounded-xl bg-[conic-gradient(#0000000d_0_25%,#0000_0_50%)] bg-[length:20px_20px] ring-1 ring-ink/10"
                aria-live="polite"
              >
                {status === 'loading' && <p className="px-4 text-center text-sm text-ink/55">{progressLabel}</p>}
                {status === 'error' && <p className="px-4 text-center text-sm text-red-600">{error}</p>}
                {resultUrl && (
                  <img src={resultUrl} alt="Gambar dengan background sudah dihapus" className="w-full object-contain" />
                )}
              </div>
              {resultUrl && <p className="mt-1 text-xs tabular-nums text-ink/45">{formatBytes(resultSize)}</p>}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {resultUrl && (
              <a
                href={resultUrl}
                download={`${original.file.name.replace(/\.[^.]+$/, '')}-no-bg.png`}
                className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Download PNG
              </a>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-full px-5 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Upload gambar lain
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
