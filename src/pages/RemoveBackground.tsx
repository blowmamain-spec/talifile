import { useEffect, useRef, useState } from 'react'
import ToolShell from '../components/ToolShell'
import MaskBrushEditor from '../components/MaskBrushEditor'
import {
  DEFAULT_BG_MODEL,
  clearModelCache,
  getModelCacheSize,
  isModelCached,
  isModelWarm,
  removeBackgroundSafe,
  warmupBackgroundModel,
} from '../lib/bgRemoval'
import type { BgModel } from '../lib/bgRemoval'
import { deliver } from '../lib/handoff'
import Dropzone from '../components/Dropzone'
import { formatBytes } from '../lib/format'

type Status = 'idle' | 'loading' | 'done' | 'error'

const qualityOptions: { value: BgModel; label: string; hint: string }[] = [
  { value: 'isnet_quint8', label: 'Cepat', hint: 'Model paling ringan (~44 MB), cocok untuk harian' },
  { value: 'isnet_fp16', label: 'Seimbang', hint: 'Kualitas lebih detail (~84 MB)' },
  { value: 'isnet', label: 'Terbaik', hint: 'Hasil paling presisi (~168 MB)' },
]

export default function RemoveBackground() {
  const [quality, setQuality] = useState<BgModel>(DEFAULT_BG_MODEL)
  const [cached, setCached] = useState<Record<BgModel, boolean>>({
    isnet_quint8: false,
    isnet_fp16: false,
    isnet: false,
  })
  const [warmModel, setWarmModel] = useState<BgModel | null>(() =>
    isModelWarm(DEFAULT_BG_MODEL) ? DEFAULT_BG_MODEL : null,
  )
  const [preloading, setPreloading] = useState(false)
  const [preloadText, setPreloadText] = useState('')
  const [cacheBytes, setCacheBytes] = useState(0)
  const [clearingCache, setClearingCache] = useState(false)
  const [original, setOriginal] = useState<{ url: string; file: File } | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')
  const [errorDetail, setErrorDetail] = useState('')
  const cancelledRef = useRef(false)
  const preloadCancelledRef = useRef(false)
  const originalUrlRef = useRef<string | null>(null)

  useEffect(() => {
    originalUrlRef.current = original?.url ?? null
  }, [original])

  useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
    }
  }, [])

  // Check which models are already stored in browser Cache Storage.
  useEffect(() => {
    const alive = { current: true }
    Promise.all([
      ...qualityOptions.map(async (o) => [o.value, await isModelCached(o.value)] as const),
    ]).then(async (pairs) => {
      if (!alive.current) return
      const next: Record<BgModel, boolean> = { isnet_quint8: false, isnet_fp16: false, isnet: false }
      for (const [m, ok] of pairs) next[m] = ok
      setCached(next)
      const bytes = await getModelCacheSize()
      if (alive.current) setCacheBytes(bytes)
    })
    return () => {
      alive.current = false
    }
  }, [])

  // Silently warm up the selected model in the persistent worker if it is already cached on device.
  useEffect(() => {
    if (!cached[quality] || isModelWarm(quality)) return
    const alive = { current: true }
    warmupBackgroundModel(quality, { onlyIfCached: true }).then((ok) => {
      if (alive.current && ok) setWarmModel(quality)
    })
    return () => {
      alive.current = false
    }
  }, [cached, quality])

  async function refreshCacheState(model: BgModel) {
    const [ok, bytes] = await Promise.all([isModelCached(model), getModelCacheSize()])
    setCached((prev) => ({ ...prev, [model]: ok }))
    setCacheBytes(bytes)
    if (isModelWarm(model)) setWarmModel(model)
  }

  async function handleClearCache() {
    setClearingCache(true)
    try {
      await clearModelCache()
      setCached({ isnet_quint8: false, isnet_fp16: false, isnet: false })
      setWarmModel(null)
      setCacheBytes(0)
    } finally {
      setClearingCache(false)
    }
  }

  async function preloadNow() {
    preloadCancelledRef.current = false
    setPreloading(true)
    setPreloadText('Menyiapkan unduhan model…')
    const ok = await warmupBackgroundModel(quality, {
      onProgress: (s) => !preloadCancelledRef.current && setPreloadText(s),
      isCancelled: () => preloadCancelledRef.current,
    })
    if (preloadCancelledRef.current) return
    setPreloading(false)
    setPreloadText('')
    if (ok) {
      await refreshCacheState(quality)
    }
  }

  function cancelPreload() {
    preloadCancelledRef.current = true
    setPreloading(false)
    setPreloadText('')
  }

  async function handleFiles(files: File[]) {
    const file = files[0]
    if (!file) return
    cancelledRef.current = false
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
    setOriginal({ url: URL.createObjectURL(file), file })
    setResultBlob(null)
    setError('')
    setErrorDetail('')
    setStatus('loading')
    setProgressLabel(
      isModelWarm(quality)
        ? 'Memproses gambar…'
        : cached[quality]
          ? 'Memuat model dari perangkat…'
          : 'Menyiapkan model…',
    )
    try {
      const blob = await removeBackgroundSafe(
        file,
        quality,
        (s) => !cancelledRef.current && setProgressLabel(s),
        () => cancelledRef.current,
      )
      if (cancelledRef.current) return
      setResultBlob(blob)
      setStatus('done')
      setPreloading(false)
      setPreloadText('')
      void refreshCacheState(quality)
    } catch (err) {
      if (cancelledRef.current) return
      console.error(err)
      const detail = err instanceof Error ? err.message : String(err)
      setError(
        /fetch|network|Failed to fetch|size/i.test(detail)
          ? 'Model AI gagal diunduh. Cek koneksi internet, lalu coba lagi.'
          : 'Perangkat ini belum bisa menjalankan penghapus background otomatis. Coba di Chrome terbaru, atau hapus manual dengan kuas.',
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
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current)
      originalUrlRef.current = null
    }
    setOriginal(null)
    setResultBlob(null)
    setStatus('idle')
    setError('')
  }

  function openManualBrush() {
    if (!original) return
    setResultBlob(original.file)
    setError('')
    setStatus('done')
  }

  const isSelectedCached = cached[quality]
  const isSelectedWarm = warmModel === quality || isModelWarm(quality)

  return (
    <ToolShell
      icon="remove-background"
      title="Remove Background"
      description="Hapus background otomatis langsung di browser, lalu rapikan bagian yang masih tersisa atau terpotong memakai kuas."
    >
      {!original && (
        <div>
          <fieldset className="mb-3 flex flex-wrap gap-2">
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
                  disabled={preloading}
                  onChange={() => setQuality(opt.value)}
                  className="sr-only"
                />
                <span className="font-medium">{opt.label}</span>
                {cached[opt.value] && (
                  <span className="ml-1.5 rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                    Tersimpan
                  </span>
                )}
                <span className="mx-1.5 opacity-50">·</span>
                <span>{opt.hint}</span>
              </label>
            ))}
          </fieldset>

          {/* Cache & warm-up status bar */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3.5 py-2.5 text-xs ring-1 ring-ink/10">
            {preloading ? (
              <>
                <span className="text-muted" role="status">
                  {preloadText || 'Mengunduh model…'}
                </span>
                <button
                  type="button"
                  onClick={cancelPreload}
                  className="font-medium text-danger underline underline-offset-4"
                >
                  Batal
                </button>
              </>
            ) : isSelectedWarm ? (
              <>
                <span className="flex items-center gap-2 text-brand-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-brand-500" />
                  Model siap di memori{cacheBytes > 0 ? ` (${formatBytes(cacheBytes)} tersimpan)` : ''}. Foto langsung diproses.
                </span>
                {cacheBytes > 0 && (
                  <button
                    type="button"
                    disabled={clearingCache}
                    onClick={handleClearCache}
                    className="shrink-0 font-medium text-muted underline underline-offset-4 hover:text-danger disabled:opacity-50"
                  >
                    {clearingCache ? 'Menghapus…' : 'Hapus cache'}
                  </button>
                )}
              </>
            ) : isSelectedCached ? (
              <>
                <span className="flex items-center gap-2 text-brand-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-brand-500" />
                  Tersimpan di perangkat{cacheBytes > 0 ? ` (${formatBytes(cacheBytes)})` : ''}, sedang disiapkan di latar belakang.
                </span>
                {cacheBytes > 0 && (
                  <button
                    type="button"
                    disabled={clearingCache}
                    onClick={handleClearCache}
                    className="shrink-0 font-medium text-muted underline underline-offset-4 hover:text-danger disabled:opacity-50"
                  >
                    {clearingCache ? 'Menghapus…' : 'Hapus cache'}
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="text-muted">
                  Diunduh sekali saat dipakai, lalu disimpan otomatis di browser (kecuali mode Incognito).
                </span>
                <div className="flex items-center gap-3">
                  {cacheBytes > 0 && (
                    <button
                      type="button"
                      disabled={clearingCache}
                      onClick={handleClearCache}
                      className="shrink-0 font-medium text-muted underline underline-offset-4 hover:text-danger disabled:opacity-50"
                    >
                      {clearingCache ? 'Menghapus…' : `Hapus cache (${formatBytes(cacheBytes)})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={preloadNow}
                    className="shrink-0 font-medium text-brand-700 underline underline-offset-4 hover:text-brand-600"
                  >
                    Unduh &amp; simpan dulu
                  </button>
                </div>
              </>
            )}
          </div>

          <Dropzone
            accept="image/*"
            onFiles={handleFiles}
            label="Klik atau drop gambar di sini"
            hint="JPG, PNG, atau WebP"
          />
        </div>
      )}

      {original && status === 'done' && resultBlob && (
        <MaskBrushEditor
          originalFile={original.file}
          originalUrl={original.url}
          resultBlob={resultBlob}
          onDownload={(blob, filename) => deliver(blob, filename)}
          onResetFile={reset}
        />
      )}

      {original && status !== 'done' && (
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
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {status === 'loading' && (
              <button
                type="button"
                onClick={cancel}
                className="rounded-full bg-red-500/10 px-5 py-2 text-sm font-medium text-danger transition-colors hover:bg-red-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                Batal
              </button>
            )}
            {status === 'error' && (
              <button
                type="button"
                onClick={openManualBrush}
                className="inline-flex min-h-11 items-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Hapus manual dengan kuas
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
