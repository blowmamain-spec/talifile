import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { saveAs } from 'file-saver'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { formatBytes, toBlob } from '../lib/format'

type ImgItem = { id: string; file: File; url: string }
type PageMode = 'fit' | 'a4'

async function normalizeImage(file: File): Promise<{ bytes: ArrayBuffer; isPng: boolean }> {
  if (file.type === 'image/png' || file.type === 'image/jpeg') {
    return { bytes: await file.arrayBuffer(), isPng: file.type === 'image/png' }
  }
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0)
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92),
  )
  return { bytes: await blob.arrayBuffer(), isPng: false }
}

export default function ImageToPdf() {
  const [items, setItems] = useState<ImgItem[]>([])
  const [pageMode, setPageMode] = useState<PageMode>('fit')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  function handleFiles(files: File[]) {
    const next = files.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
    }))
    setItems((prev) => [...prev, ...next])
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function move(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id)
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  async function generate() {
    if (!items.length) return
    setWorking(true)
    setError('')
    try {
      const pdf = await PDFDocument.create()
      const A4: [number, number] = [595.28, 841.89]

      for (const item of items) {
        const { bytes, isPng } = await normalizeImage(item.file)
        const image = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
        const { width, height } = image

        if (pageMode === 'fit') {
          const page = pdf.addPage([width, height])
          page.drawImage(image, { x: 0, y: 0, width, height })
        } else {
          const page = pdf.addPage(A4)
          const margin = 24
          const maxW = A4[0] - margin * 2
          const maxH = A4[1] - margin * 2
          const scale = Math.min(maxW / width, maxH / height)
          const w = width * scale
          const h = height * scale
          page.drawImage(image, {
            x: (A4[0] - w) / 2,
            y: (A4[1] - h) / 2,
            width: w,
            height: h,
          })
        }
      }

      const bytes = await pdf.save()
      saveAs(toBlob(bytes, 'application/pdf'), 'images.pdf')
    } catch (err) {
      console.error(err)
      setError('Gagal membuat PDF. Pastikan semua file berupa gambar JPG/PNG.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell title="Image to PDF" description="Gabungkan beberapa gambar menjadi satu file PDF.">
      <Dropzone
        accept="image/png,image/jpeg,image/webp"
        multiple
        onFiles={handleFiles}
        label="Klik atau drop gambar di sini"
        hint="Bisa pilih lebih dari satu, urutan bisa diatur di bawah"
      />

      {items.length > 0 && (
        <div className="mt-6">
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl bg-ink/[0.03] p-3">
                <img src={item.url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <p className="text-xs tabular-nums text-ink/45">{formatBytes(item.file.size)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(item.id, -1)}
                    className="rounded-full p-1.5 text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                    aria-label="Pindah ke atas"
                  >
                    <ArrowIcon direction="up" />
                  </button>
                  <button
                    type="button"
                    disabled={i === items.length - 1}
                    onClick={() => move(item.id, 1)}
                    className="rounded-full p-1.5 text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                    aria-label="Pindah ke bawah"
                  >
                    <ArrowIcon direction="down" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="rounded-full p-1.5 text-ink/50 transition-colors hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                    aria-label="Hapus gambar"
                  >
                    <XIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <fieldset className="mt-6 flex flex-wrap items-center gap-5">
            <legend className="sr-only">Ukuran halaman</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="page-mode"
                checked={pageMode === 'fit'}
                onChange={() => setPageMode('fit')}
                className="accent-brand-500"
              />
              Ukuran halaman = ukuran gambar
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="page-mode"
                checked={pageMode === 'a4'}
                onChange={() => setPageMode('a4')}
                className="accent-brand-500"
              />
              Muat ke halaman A4
            </label>
          </fieldset>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={working}
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Membuat PDF…' : `Buat PDF (${items.length} gambar)`}
          </button>
        </div>
      )}
    </ToolShell>
  )
}

function ArrowIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={`h-3.5 w-3.5 ${direction === 'down' ? 'rotate-180' : ''}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 13V3m0 0 4 4M8 3 4 7" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-3.5 w-3.5"
    >
      <path strokeLinecap="round" d="M4 4l8 8m0-8-8 8" />
    </svg>
  )
}
