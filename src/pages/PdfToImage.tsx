import { useState } from 'react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'
import { friendlyPdfError } from '../lib/pdfErrors'

type PagePreview = { index: number; thumb: string }

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
        items.push({ index: i - 1, thumb: canvas.toDataURL('image/jpeg', 0.7) })
      }
      setPages(items)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal membuka PDF. Pastikan file tidak rusak.'))
    } finally {
      setLoading(false)
    }
  }

  async function exportImages() {
    if (!file || !pages.length) return
    setWorking(true)
    setError('')
    try {
      const pdfDoc = await loadPdfDocument(file)
      const baseName = file.name.replace(/\.pdf$/i, '')

      if (pdfDoc.numPages === 1) {
        const page = await pdfDoc.getPage(1)
        const canvas = await renderPageToCanvas(page, 2)
        const blob = await canvasToBlob(canvas, quality)
        saveAs(blob, `${baseName}.jpg`)
      } else {
        const zip = new JSZip()
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          setProgress(`Mengekspor halaman ${i}/${pdfDoc.numPages}…`)
          const page = await pdfDoc.getPage(i)
          const canvas = await renderPageToCanvas(page, 2)
          const blob = await canvasToBlob(canvas, quality)
          zip.file(`${baseName}-hal-${i}.jpg`, blob)
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
    <ToolShell title="PDF to Image" description="Ekspor setiap halaman PDF jadi gambar JPG.">
      {!file && (
        <Dropzone
          accept="application/pdf"
          onFiles={handleFiles}
          label="Klik atau drop file PDF di sini"
        />
      )}

      {loading && <p className="mt-4 text-sm text-ink/55">Membuka PDF…</p>}
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {file && pages.length > 0 && (
        <div>
          <p className="mb-4 text-sm tabular-nums text-ink/50">{pages.length} halaman</p>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {pages.map((p) => (
              <div key={p.index} className="overflow-hidden rounded-lg ring-1 ring-ink/10">
                <img src={p.thumb} alt="" className="w-full" />
                <p className="bg-ink/5 py-1 text-center text-xs tabular-nums">{p.index + 1}</p>
              </div>
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
            disabled={working}
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working
              ? progress || 'Mengekspor…'
              : pages.length === 1
                ? 'Download JPG'
                : `Download semua (${pages.length} JPG, .zip)`}
          </button>
        </div>
      )}
    </ToolShell>
  )
}
