import { useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import { saveAs } from 'file-saver'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { SortableList, DragHandle } from '../components/SortableList'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'

type PageItem = { id: string; originalIndex: number; thumb: string; rotation: 0 | 90 | 180 | 270 }

export default function OrganizePdf() {
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
        items.push({
          id: `p${i}`,
          originalIndex: i - 1,
          thumb: canvas.toDataURL('image/jpeg', 0.7),
          rotation: 0,
        })
      }
      setPages(items)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal membuka PDF. Pastikan file tidak rusak.'))
    } finally {
      setLoading(false)
    }
  }

  function rotate(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: ((p.rotation + 90) % 360) as PageItem['rotation'] } : p)),
    )
  }

  function remove(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id))
  }

  async function save() {
    if (!file || !pages.length) return
    setWorking(true)
    setError('')
    try {
      const srcBytes = await file.arrayBuffer()
      const src = await PDFDocument.load(srcBytes)
      const out = await PDFDocument.create()
      const copied = await out.copyPages(
        src,
        pages.map((p) => p.originalIndex),
      )
      copied.forEach((page, i) => {
        const extra = pages[i].rotation
        if (extra) {
          const current = page.getRotation().angle
          page.setRotation(degrees((current + extra) % 360))
        }
        out.addPage(page)
      })
      const bytes = await out.save()
      saveAs(toBlob(bytes, 'application/pdf'), `${file.name.replace(/\.pdf$/i, '')}-organized.pdf`)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menyimpan PDF.'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell
      title="Organize PDF"
      description="Hapus, putar, atau seret untuk mengatur ulang urutan halaman."
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
          <p className="mb-4 text-sm tabular-nums text-ink/50">
            {pages.length} halaman — seret buat ubah urutan
          </p>

          <SortableList
            items={pages}
            onReorder={setPages}
            strategy="grid"
            className="grid grid-cols-3 gap-3 sm:grid-cols-5"
            renderItem={(p, dragHandleProps) => (
              <div className="group relative overflow-hidden rounded-lg bg-ink/[0.03] ring-1 ring-ink/10">
                <div className="absolute left-1 top-1 z-10">
                  <DragHandle {...dragHandleProps} />
                </div>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label="Hapus halaman"
                  className="absolute right-1 top-1 z-10 rounded-full bg-ink/5 p-1 text-ink/50 transition-colors hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3 w-3">
                    <path strokeLinecap="round" d="M4 4l8 8m0-8-8 8" />
                  </svg>
                </button>
                <div className="flex items-center justify-center overflow-hidden p-4 pt-7">
                  <img
                    src={p.thumb}
                    alt=""
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                    className="max-h-28 max-w-full transition-transform"
                  />
                </div>
                <div className="flex items-center justify-between bg-ink/5 px-2 py-1">
                  <span className="text-xs tabular-nums text-ink/60">
                    {pages.findIndex((x) => x.id === p.id) + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => rotate(p.id)}
                    aria-label="Putar 90 derajat"
                    className="rounded-full p-1 text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7.5A5 5 0 1 1 10.5 3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          />

          <button
            type="button"
            onClick={save}
            disabled={working}
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Menyimpan…' : 'Simpan PDF'}
          </button>
        </div>
      )}
    </ToolShell>
  )
}
