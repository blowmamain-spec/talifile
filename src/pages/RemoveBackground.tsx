import { useRef, useState } from 'react'
import ToolShell from '../components/ToolShell'
import { removeBackgroundSafe } from '../lib/bgRemoval'
import { offerFromUrl } from '../lib/handoff'
import Dropzone from '../components/Dropzone'
import { formatBytes } from '../lib/format'

type Status = 'idle' | 'loading' | 'done' | 'error'
type Quality = 'isnet_quint8' | 'isnet_fp16' | 'isnet'

const qualityOptions: { value: Quality; label: string; hint: string }[] = [
  { value: 'isnet_quint8', label: 'Cepat', hint: 'Model paling kecil, download tercepat' },
  { value: 'isnet_fp16', label: 'Seimbang', hint: 'Kualitas bagus, ukuran sedang' },
  { value: 'isnet', label: 'Terbaik', hint: 'Hasil paling presisi, download lebih besar' },
]

export default function RemoveBackground() {
  const [quality, setQuality] = useState<Quality>('isnet_fp16')
  const [original, setOriginal] = useState<{ url: string; file: File } | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultSize, setResultSize] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')
  const [errorDetail, setErrorDetail] = useState('')
  const cancelledRef = useRef(false)

  async function handleFiles(files: File[]) {
    const file = files[0]
    if (!file) return
    cancelledRef.current = false
    setOriginal({ url: URL.createObjectURL(file), file })
    setResultUrl(null)
    setError('')
    setErrorDetail('')
    setStatus('loading')
    setProgressLabel('Menyiapkan model…')
    try {
      const blob = await removeBackgroundSafe(
        file,
        quality,
        (s) => !cancelledRef.current && setProgressLabel(s),
        () => cancelledRef.current,
      )
      if (cancelledRef.current) return
      setResultUrl(URL.createObjectURL(blob))
      setResultSize(blob.size)
      setStatus('done')
    } catch (err) {
      if (cancelledRef.current) return
      console.error(err)
      const detail = err instanceof Error ? err.message : String(err)
      setError(
        /fetch|network|Failed to fetch|size/i.test(detail)
          ? 'Model AI gagal diunduh. Cek koneksi internet, lalu coba lagi.'
          : 'Perangkat ini belum bisa menjalankan penghapus background. Coba di browser Chrome versi terbaru, atau di perangkat lain.',
      )
      setErrorDetail(detail)
      setStatus('error')
    }
  }

  function cancel() {
    cancelledRef.current = true
    reset()
  }

  function reset() {
    setOriginal(null)
    setResultUrl(null)
    setStatus('idle')
    setError('')
  }

  return (
    <ToolShell
      icon="remove-background"
      title="Remove Background"
      description="Upload gambar, background dihapus otomatis langsung di browser. Model AI diunduh sekali saat pertama dipakai."
    >
      {!original && (
        <div>
          <fieldset className="mb-5 flex flex-wrap gap-2">
            <legend className="mb-2 text-sm font-medium">Kualitas model</legend>
            {qualityOptions.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  quality === opt.value
                    ? 'bg-brand-500/10 text-brand-700 ring-1 ring-brand-500'
                    : 'bg-ink/5 text-ink/65 hover:bg-ink/10'
                }`}
              >
                <input
                  type="radio"
                  name="quality"
                  value={opt.value}
                  checked={quality === opt.value}
                  onChange={() => setQuality(opt.value)}
                  className="sr-only"
                />
                <span className="font-medium">{opt.label}</span>
                <span className="mx-1.5 opacity-50">·</span>
                <span>{opt.hint}</span>
              </label>
            ))}
          </fieldset>

          <Dropzone
            accept="image/*"
            onFiles={handleFiles}
            label="Klik atau drop gambar di sini"
            hint="JPG, PNG, atau WebP"
          />
        </div>
      )}

      {original && (
        <div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Original</p>
              <div className="overflow-hidden rounded-xl bg-[conic-gradient(#0000000d_0_25%,#0000_0_50%)] bg-[length:20px_20px] ring-1 ring-ink/10">
                <img src={original.url} alt="Gambar asli sebelum diproses" className="w-full object-contain" />
              </div>
              <p className="mt-1 text-xs tabular-nums text-muted">{formatBytes(original.file.size)}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Hasil</p>
              <div
                className="flex min-h-[160px] items-center justify-center overflow-hidden rounded-xl bg-[conic-gradient(#0000000d_0_25%,#0000_0_50%)] bg-[length:20px_20px] ring-1 ring-ink/10"
                aria-live="polite"
              >
                {status === 'loading' && <p className="px-4 text-center text-sm text-muted">{progressLabel}</p>}
                {status === 'error' && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-danger">{error}</p>
                    {errorDetail && (
                      <details className="mt-3 text-left text-xs text-muted">
                        <summary className="cursor-pointer text-center">Detail teknis (untuk laporan)</summary>
                        <p className="mt-2 break-all font-mono">{errorDetail}</p>
                      </details>
                    )}
                  </div>
                )}
                {resultUrl && (
                  <img src={resultUrl} alt="Gambar dengan background sudah dihapus" className="w-full object-contain" />
                )}
              </div>
              {resultUrl && <p className="mt-1 text-xs tabular-nums text-muted">{formatBytes(resultSize)}</p>}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {resultUrl && (
              <a
                href={resultUrl}
                download={`${original.file.name.replace(/\.[^.]+$/, '')}-no-bg.png`}
                onClick={() => offerFromUrl(resultUrl, `${original.file.name.replace(/\.[^.]+$/, '')}-no-bg.png`)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Download PNG
              </a>
            )}
            {status === 'loading' && (
              <button
                type="button"
                onClick={cancel}
                className="rounded-full bg-red-500/10 px-5 py-2 text-sm font-medium text-danger transition-colors hover:bg-red-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                Batal
              </button>
            )}
            {status !== 'loading' && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-11 items-center rounded-full bg-surface px-5 text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Ganti gambar
              </button>
            )}
          </div>
        </div>
      )}
    </ToolShell>
  )
}
