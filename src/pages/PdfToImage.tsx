import { useState } from 'react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'
import { friendlyPdfError } from '../lib/pdfErrors'

type PagePreview = { index: number; thumb: string; selected: boolean }

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality))
}

export default function PdfToImage() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PagePreview[]>([])
  const [quality, setQuality] = useState(0.85)
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const selected = pages.filter((p) => p.selected)

  async function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    setPages([])
    setError('')
    setLoading(true)
    try {
      const pdfDoc = await loadPdfDocument(f)
      const items: PagePreview[] = []
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const canvas = await renderPageToCanvas(page, 0.35)
        items.push({ index: i - 1, thumb: canvas.toDataURL('image/jpeg', 0.7), selected: true })
      }
      setPages(items)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal membuka PDF. Pastikan file tidak rusak.'))
    } finally {
      setLoading(false)
    }
  }

  function toggle(index: number) {
    setPages((prev) => prev.map((p) => (p.index === index ? { ...p, selected: !p.selected } : p)))
  }

  function selectAll(value: boolean) {
    setPages((prev) => prev.map((p) => ({ ...p, selected: value })))
  }

  async function exportImages() {
    if (!file || !selected.length) return
    setWorking(true)
    setError('')
    try {
      const pdfDoc = await loadPdfDocument(file)
      const baseName = file.name.replace(/\.pdf$/i, '')

      if (selected.length === 1) {
        const n = selected[0].index + 1
        const page = await pdfDoc.getPage(n)
        const canvas = await renderPageToCanvas(page, 2)
        const blob = await canvasToBlob(canvas, quality)
        saveAs(blob, `${baseName}-hal-${n}.jpg`)
      } else {
        const zip = new JSZip()
        for (const [i, p] of selected.entries()) {
          const n = p.index + 1
          setProgress(`Mengekspor ${i + 1}/${selected.length}…`)
          const page = await pdfDoc.getPage(n)
          const canvas = await renderPageToCanvas(page, 2)
          const blob = await canvasToBlob(canvas, quality)
          zip.file(`${baseName}-hal-${n}.jpg`, blob)
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, `${baseName}-images.zip`)
      }
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal mengekspor gambar.'))
    } finally {
      setWorking(false)
      setProgress('')
    }
  }

  return (
    <ToolShell
      icon="pdf-to-image"
      title="PDF to Image"
      description="Ekspor halaman PDF jadi gambar JPG. Pilih halaman mana saja yang mau diambil."
    >
      {!file && (
        <Dropzone accept="application/pdf" onFiles={handleFiles} label="Klik atau drop file PDF di sini" />
      )}

      {loading && <p className="mt-4 text-sm text-ink/55">Membuka PDF…</p>}
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {file && pages.length > 0 && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm tabular-nums text-ink/50">
              {selected.length} dari {pages.length} halaman dipilih
            </p>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => selectAll(true)}
                className="rounded-full bg-ink/5 px-3 py-1 text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Pilih semua
              </button>
              <button
                type="button"
                onClick={() => selectAll(false)}
                className="rounded-full bg-ink/5 px-3 py-1 text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Kosongkan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {pages.map((p) => (
              <button
                key={p.index}
                type="button"
                onClick={() => toggle(p.index)}
                aria-pressed={p.selected}
                aria-label={`Halaman ${p.index + 1}${p.selected ? ', dipilih' : ''}`}
                className={`relative overflow-hidden rounded-lg text-left ring-2 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                  p.selected ? 'ring-brand-500' : 'opacity-45 ring-transparent hover:opacity-75'
                }`}
              >
                <img src={p.thumb} alt="" className="w-full" />
                <span
                  aria-hidden="true"
                  className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    p.selected ? 'bg-brand-500 text-on-brand' : 'bg-white/90 text-transparent ring-1 ring-ink/20'
                  }`}
                >
                  ✓
                </span>
                <p className="bg-ink/5 py-1 text-center text-xs tabular-nums">{p.index + 1}</p>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label className="flex items-center justify-between text-sm">
              <span>Kualitas JPG</span>
              <span className="tabular-nums text-ink/50">{Math.round(quality * 100)}%</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="mt-2 w-full accent-brand-500"
            />
          </div>

          <button
            type="button"
            onClick={exportImages}
            disabled={working || selected.length === 0}
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working
              ? progress || 'Mengekspor…'
              : selected.length === 0
                ? 'Pilih minimal 1 halaman'
                : selected.length === 1
                  ? 'Download JPG'
                  : `Download ${selected.length} JPG (.zip)`}
          </button>
        </div>
      )}
    </ToolShell>
  )
}
