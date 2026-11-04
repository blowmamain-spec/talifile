import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { saveAs } from 'file-saver'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { SortableList, DragHandle } from '../components/SortableList'
import { formatBytes, toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'

type PdfItem = { id: string; file: File }

export default function MergePdf() {
  const [items, setItems] = useState<PdfItem[]>([])
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  function handleFiles(files: File[]) {
    const next = files.map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, file }))
    setItems((prev) => [...prev, ...next])
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  async function merge() {
    if (items.length < 2) return
    setWorking(true)
    setError('')
    try {
      const out = await PDFDocument.create()
      for (const item of items) {
        const bytes = await item.file.arrayBuffer()
        const src = await PDFDocument.load(bytes)
        const copied = await out.copyPages(src, src.getPageIndices())
        copied.forEach((p) => out.addPage(p))
      }
      const bytes = await out.save()
      saveAs(toBlob(bytes, 'application/pdf'), 'merged.pdf')
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menggabungkan PDF. Pastikan semua file PDF valid.'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell title="Merge PDF" description="Gabungkan beberapa file PDF jadi satu, urutan bisa diatur.">
      <Dropzone
        accept="application/pdf"
        multiple
        onFiles={handleFiles}
        label="Klik atau drop file PDF di sini"
        hint="Bisa pilih lebih dari satu, urutan bisa diatur di bawah"
      />

      {items.length > 0 && (
        <div className="mt-6">
          <SortableList
            items={items}
            onReorder={setItems}
            className="space-y-1.5"
            renderItem={(item, dragHandleProps) => (
              <div className="flex items-center gap-2 rounded-xl bg-ink/[0.03] p-3">
                <DragHandle {...dragHandleProps} />
                <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-ink/[0.06] text-[10px] font-medium uppercase text-ink/50">
                  PDF
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <p className="text-xs tabular-nums text-ink/45">{formatBytes(item.file.size)}</p>
                </div>
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
              </div>
            )}
          />

          {items.length === 1 && (
            <p className="mt-4 text-sm text-ink/50">Tambah minimal satu PDF lagi buat digabungkan.</p>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={merge}
            disabled={working || items.length < 2}
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Menggabungkan…' : `Gabungkan ${items.length} PDF`}
          </button>
        </div>
      )}
    </ToolShell>
  )
}
