import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'

type PageItem = { index: number; thumb: string; selected: boolean }

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
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
      const items: PageItem[] = []
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

  function selectAll(selected: boolean) {
    setPages((prev) => prev.map((p) => ({ ...p, selected })))
  }

  async function extractSelected() {
    if (!file) return
    const selected = pages.filter((p) => p.selected).map((p) => p.index)
    if (!selected.length) return
    setWorking(true)
    setError('')
    try {
      const srcBytes = await file.arrayBuffer()
      const src = await PDFDocument.load(srcBytes)
      const out = await PDFDocument.create()
      const copied = await out.copyPages(src, selected)
      copied.forEach((p) => out.addPage(p))
      const bytes = await out.save()
      saveAs(
        toBlob(bytes, 'application/pdf'),
        `${file.name.replace(/\.pdf$/i, '')}-pilihan.pdf`,
      )
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal memisahkan halaman.'))
    } finally {
      setWorking(false)
    }
  }

  async function splitEveryPage() {
    if (!file) return
    setWorking(true)
    setError('')
    try {
      const srcBytes = await file.arrayBuffer()
      const src = await PDFDocument.load(srcBytes)
      const zip = new JSZip()
      const baseName = file.name.replace(/\.pdf$/i, '')

      for (let i = 0; i < src.getPageCount(); i++) {
        const out = await PDFDocument.create()
        const [page] = await out.copyPages(src, [i])
        out.addPage(page)
        const bytes = await out.save()
        zip.file(`${baseName}-hal-${i + 1}.pdf`, bytes)
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, `${baseName}-split.zip`)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal memisahkan halaman.'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell
      title="Split PDF"
      description="Pisahkan setiap halaman jadi file sendiri, atau ambil halaman tertentu saja."
    >
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
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm tabular-nums text-ink/50">{pages.length} halaman</p>
            <div className="flex gap-4 text-sm">
              <button
                type="button"
                onClick={() => selectAll(true)}
                className="text-brand-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Pilih semua
              </button>
              <button
                type="button"
                onClick={() => selectAll(false)}
                className="text-brand-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Hapus pilihan
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
                aria-label={`Halaman ${p.index + 1}${p.selected ? ', terpilih' : ''}`}
                className={`overflow-hidden rounded-lg text-left ring-2 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                  p.selected ? 'ring-brand-500' : 'opacity-45 ring-transparent hover:opacity-75'
                }`}
              >
                <img src={p.thumb} alt="" className="w-full" />
                <p className="bg-ink/5 py-1 text-center text-xs tabular-nums">{p.index + 1}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={extractSelected}
              disabled={working || !pages.some((p) => p.selected)}
              className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Download halaman terpilih (1 PDF)
            </button>
            <button
              type="button"
              onClick={splitEveryPage}
              disabled={working}
              className="rounded-full px-5 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Pisah semua halaman (.zip)
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
