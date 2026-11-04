import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { formatBytes, toBlob } from '../lib/format'
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
    return imageCompression(f, {
      maxWidthOrHeight: maxDim,
      initialQuality: quality,
      useWebWorker: true,
      maxSizeMB: 50,
    })
  }

  async function compressPdf(f: File) {
    const pdfDoc = await loadPdfDocument(f)
    const out = await PDFDocument.create()
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const canvas = await renderPageToCanvas(page, 1.5)
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
              ? { ...i, status: 'done', outSize: blob.size, outUrl: URL.createObjectURL(blob) }
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
      const blob = await (await fetch(item.outUrl)).blob()
      zip.file(item.outName, blob)
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, 'compressed.zip')
  }

  return (
    <ToolShell icon="compress" title="Compress File" description="Perkecil ukuran gambar atau PDF langsung di browser.">
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
              <li key={item.id} className="flex items-center gap-3 rounded-xl bg-ink/[0.03] p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <p className="text-xs tabular-nums text-ink/45">
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
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-500/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                  >
                    Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="shrink-0 rounded-full p-1.5 text-ink/50 transition-colors hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
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
            <div>
              <label className="flex items-center justify-between text-sm">
                <span>Kualitas</span>
                <span className="tabular-nums text-ink/50">{Math.round(quality * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.2}
                max={0.95}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-2 w-full accent-brand-500"
              />
              {hasPdf && (
                <p className="mt-2 text-sm text-ink/50">
                  File PDF akan diubah jadi gambar per halaman, teks tidak lagi bisa diseleksi/dicopy.
                  Cocok untuk PDF hasil scan.
                </p>
              )}
            </div>

            {hasImage && (
              <div>
                <label className="flex items-center justify-between text-sm">
                  <span>Dimensi maksimum gambar</span>
                  <span className="tabular-nums text-ink/50">{maxDim}px</span>
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
              className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {working ? 'Mengompres…' : `Compress (${items.length} file)`}
            </button>
            {doneItems.length > 1 && (
              <button
                type="button"
                onClick={downloadAll}
                className="rounded-full px-5 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Download semua (.zip)
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-full px-5 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Mulai ulang
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
