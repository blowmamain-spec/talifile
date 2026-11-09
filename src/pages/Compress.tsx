import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { deliver as saveAs } from '../lib/handoff'
import JSZip from 'jszip'
import ToolShell from '../components/ToolShell'
import { blobFromUrl, deliverFromUrl, objectUrl } from '../lib/handoff'
import Dropzone from '../components/Dropzone'
import { formatBytes, toBlob } from '../lib/format'
import { Chips, Slider } from '../components/ui'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'
import { friendlyPdfError } from '../lib/pdfErrors'

type Kind = 'image' | 'pdf'
type Status = 'pending' | 'working' | 'done' | 'error'
type Item = {
  id: string
  file: File
  kind: Kind
  status: Status
  outName: string
  outSize?: number
  outUrl?: string
  error?: string
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality))
}

export default function Compress() {
  const [items, setItems] = useState<Item[]>([])
  const [quality, setQuality] = useState(0.7)
  const [maxDim, setMaxDim] = useState(1920)
  const [imageMode, setImageMode] = useState<'kualitas' | 'target'>('kualitas')
  const [targetKb, setTargetKb] = useState(200)
  const [pdfDpi, setPdfDpi] = useState(110)
  const [pdfGray, setPdfGray] = useState(false)
  const [working, setWorking] = useState(false)

  const hasImage = items.some((i) => i.kind === 'image')
  const hasPdf = items.some((i) => i.kind === 'pdf')
  const doneItems = items.filter((i) => i.status === 'done')

  function handleFiles(files: File[]) {
    const next = files.map((file): Item => {
      const kind: Kind = file.type === 'application/pdf' ? 'pdf' : 'image'
      return {
        id: `${file.name}-${file.size}-${Math.random()}`,
        file,
        kind,
        status: 'pending',
        outName:
          kind === 'image' ? `compressed-${file.name}` : `${file.name.replace(/\.pdf$/i, '')}-compressed.pdf`,
      }
    })
    setItems((prev) => [...prev, ...next])
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function reset() {
    setItems([])
  }

  async function compressImage(f: File) {
    const { default: imageCompression } = await import('browser-image-compression')
    // Target mode: the library lowers quality and size step by step until the file fits under the limit.
    return imageCompression(f, {
      maxWidthOrHeight: maxDim,
      initialQuality: imageMode === 'target' ? 0.92 : quality,
      useWebWorker: true,
      maxSizeMB: imageMode === 'target' ? targetKb / 1024 : 50,
      maxIteration: 20,
    })
  }

  async function compressPdf(f: File) {
    const pdfDoc = await loadPdfDocument(f)
    const out = await PDFDocument.create()
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const canvas = await renderPageToCanvas(page, pdfDpi / 72)
      if (pdfGray) {
        // Scans of plain documents need no color: grayscale JPEGs come out noticeably smaller.
        const ctx = canvas.getContext('2d')!
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = img.data
        for (let k = 0; k < d.length; k += 4) {
          const g = d[k] * 0.299 + d[k + 1] * 0.587 + d[k + 2] * 0.114
          d[k] = d[k + 1] = d[k + 2] = g
        }
        ctx.putImageData(img, 0, 0)
      }
      const blob = await canvasToBlob(canvas, quality)
      const bytes = await blob.arrayBuffer()
      const img = await out.embedJpg(bytes)
      const viewport = page.getViewport({ scale: 1 })
      const outPage = out.addPage([viewport.width, viewport.height])
      outPage.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height })
    }
    const bytes = await out.save()
    return toBlob(bytes, 'application/pdf')
  }

  async function run() {
    setWorking(true)
    for (const item of items) {
      if (item.status === 'done') continue
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'working' } : i)))
      try {
        const blob = item.kind === 'image' ? await compressImage(item.file) : await compressPdf(item.file)
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'done', outSize: blob.size, outUrl: objectUrl(blob) }
              : i,
          ),
        )
      } catch (err) {
        console.error(err)
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'error', error: friendlyPdfError(err, 'Gagal diproses.') }
              : i,
          ),
        )
      }
    }
    setWorking(false)
  }

  async function downloadAll() {
    const zip = new JSZip()
    for (const item of doneItems) {
      if (!item.outUrl) continue
      const blob = blobFromUrl(item.outUrl)
      zip.file(item.outName, blob)
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, 'compressed.zip')
  }

  return (
    <ToolShell icon="compress" title="Compress File" description="Perkecil gambar atau PDF langsung di browser, termasuk sampai di bawah batas ukuran upload.">
      <Dropzone
        accept="image/*,application/pdf"
        multiple
        onFiles={handleFiles}
        label="Klik atau drop gambar / PDF di sini"
        hint="Bisa pilih lebih dari satu, campur gambar dan PDF juga boleh"
      />

      {items.length > 0 && (
        <div className="mt-6">
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl bg-surface ring-1 ring-ink/10 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <p className="text-xs tabular-nums text-muted">
                    {item.status === 'done' && item.outSize !== undefined
                      ? `${formatBytes(item.file.size)} → ${formatBytes(item.outSize)} (${Math.max(0, Math.round((1 - item.outSize / item.file.size) * 100))}% lebih kecil)`
                      : item.status === 'working'
                        ? 'Memproses…'
                        : item.status === 'error'
                          ? item.error
                          : formatBytes(item.file.size)}
                  </p>
                </div>
                {item.status === 'done' && item.outUrl && (
                  <a
                    href={item.outUrl}
                    download={item.outName}
                    onClick={(e) => { e.preventDefault(); deliverFromUrl(item.outUrl!, item.outName) }}
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-500/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                  >
                    Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="shrink-0 rounded-full bg-ink/5 p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                  aria-label="Hapus dari daftar"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" d="M4 4l8 8m0-8-8 8" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-5">
            <div className={!hasPdf && imageMode === 'target' ? 'hidden' : ''}>
              <Slider
                label={hasPdf && imageMode === 'target' ? 'Kualitas (untuk PDF)' : 'Kualitas'}
                value={quality}
                display={`${Math.round(quality * 100)}%`}
                min={0.2}
                max={0.95}
                step={0.05}
                onChange={setQuality}
              />
              {hasPdf && (
                <p className="mt-2 text-sm text-muted">
                  File PDF akan diubah jadi gambar per halaman, teks tidak lagi bisa diseleksi/dicopy.
                  Cocok untuk PDF hasil scan.
                </p>
              )}
            </div>

            {hasPdf && (
              <div className="space-y-4">
                <Slider label="Resolusi halaman PDF" value={pdfDpi} display={`${pdfDpi} DPI`} min={72} max={200} step={2} onChange={setPdfDpi} />
                <p className="-mt-2 text-xs text-muted">Sekitar 100 DPI cukup untuk dibaca di layar, 150 DPI untuk dicetak.</p>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={pdfGray} onChange={(e) => setPdfGray(e.target.checked)} className="h-4 w-4 accent-brand-500" />
                  Jadikan hitam-putih (lebih kecil, cocok untuk dokumen teks)
                </label>
              </div>
            )}

            {hasImage && (
              <div className="space-y-4">
                <Chips
                  name="image-mode"
                  legend="Untuk gambar"
                  value={imageMode}
                  onChange={setImageMode}
                  options={[
                    { value: 'kualitas', label: 'Atur kualitas' },
                    { value: 'target', label: 'Target ukuran maksimal' },
                  ]}
                />
                {imageMode === 'target' && (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {[100, 200, 300, 500, 1024].map((kb) => (
                        <button
                          key={kb}
                          type="button"
                          onClick={() => setTargetKb(kb)}
                          aria-pressed={targetKb === kb}
                          className={`min-h-11 rounded-full px-4 text-sm font-medium ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                            targetKb === kb ? 'bg-brand-500/12 text-brand-700 ring-brand-500' : 'bg-surface ring-ink/10 hover:text-ink'
                          }`}
                        >
                          {kb >= 1024 ? '1 MB' : `${kb} KB`}
                        </button>
                      ))}
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm">
                      Atau tulis sendiri
                      <input
                        type="number"
                        min={20}
                        max={10240}
                        value={targetKb}
                        onChange={(e) => setTargetKb(Math.max(20, Number(e.target.value) || 20))}
                        className="w-24 rounded-lg bg-surface px-3 py-1.5 tabular-nums outline-none ring-1 ring-ink/15 focus-visible:ring-2 focus-visible:ring-brand-500"
                      />
                      KB
                    </label>
                    <p className="mt-2 text-xs text-muted">Untuk syarat upload seperti "maksimal 200 KB". Kalau tetap kebesaran, kecilkan dimensi di bawah.</p>
                  </div>
                )}
              </div>
            )}

            {hasImage && (
              <div>
                <label className="flex items-center justify-between text-sm">
                  <span>Dimensi maksimum gambar</span>
                  <span className="tabular-nums text-muted">{maxDim}px</span>
                </label>
                <input
                  type="range"
                  min={480}
                  max={4000}
                  step={40}
                  value={maxDim}
                  onChange={(e) => setMaxDim(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-500"
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={run}
              disabled={working || items.every((i) => i.status === 'done')}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {working ? 'Mengompres…' : `Compress (${items.length} file)`}
            </button>
            {doneItems.length > 1 && (
              <button
                type="button"
                onClick={downloadAll}
                className="inline-flex min-h-11 items-center rounded-full bg-surface px-5 text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Download semua (.zip)
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center rounded-full bg-surface px-5 text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Mulai ulang
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
