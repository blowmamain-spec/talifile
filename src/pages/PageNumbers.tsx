import { useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { saveAs } from 'file-saver'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'

type VPos = 'top' | 'bottom'
type HPos = 'left' | 'center' | 'right'
type Format = 'n' | 'n-of-total' | 'halaman-n' | 'halaman-n-dari'

const formats: { value: Format; label: string }[] = [
  { value: 'n', label: '1' },
  { value: 'n-of-total', label: '1 / 10' },
  { value: 'halaman-n', label: 'Halaman 1' },
  { value: 'halaman-n-dari', label: 'Halaman 1 dari 10' },
]

function formatLabel(format: Format, n: number, total: number) {
  switch (format) {
    case 'n':
      return String(n)
    case 'n-of-total':
      return `${n} / ${total}`
    case 'halaman-n':
      return `Halaman ${n}`
    case 'halaman-n-dari':
      return `Halaman ${n} dari ${total}`
  }
}

type Preview = { dataUrl: string; widthPt: number; heightPt: number; pageCount: number }

const MARGIN = 28

const chip = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500 ${
    active ? 'bg-brand-500/10 text-brand-700 ring-1 ring-brand-500' : 'bg-ink/5 text-ink/65 hover:bg-ink/10'
  }`

export default function PageNumbers() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [vpos, setVpos] = useState<VPos>('bottom')
  const [hpos, setHpos] = useState<HPos>('center')
  const [format, setFormat] = useState<Format>('n')
  const [fontSize, setFontSize] = useState(11)
  const [startAt, setStartAt] = useState(1)
  const [skipFirst, setSkipFirst] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError('')
    setPreview(null)
    try {
      const pdfDoc = await loadPdfDocument(f)
      const page = await pdfDoc.getPage(1)
      const viewport = page.getViewport({ scale: 1 })
      const canvas = await renderPageToCanvas(page, 1.5)
      setPreview({
        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
        widthPt: viewport.width,
        heightPt: viewport.height,
        pageCount: pdfDoc.numPages,
      })
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal membuka PDF. Pastikan file tidak rusak.'))
    }
  }

  // Numbered pages exclude the cover when it is skipped, so "dari N" counts only numbered pages.
  const numberedTotal = preview ? preview.pageCount - (skipFirst ? 1 : 0) : 0
  const lastNumber = startAt + numberedTotal - 1
  const previewLabel = skipFirst
    ? null
    : formatLabel(format, startAt, lastNumber)

  async function apply() {
    if (!file) return
    setWorking(true)
    setError('')
    try {
      const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const pages = pdfDoc.getPages()
      const total = startAt + pages.length - (skipFirst ? 1 : 0) - 1

      pages.forEach((page, i) => {
        if (skipFirst && i === 0) return
        const n = startAt + i - (skipFirst ? 1 : 0)
        const label = formatLabel(format, n, total)
        const textWidth = font.widthOfTextAtSize(label, fontSize)
        const { width, height } = page.getSize()
        const x =
          hpos === 'left' ? MARGIN : hpos === 'right' ? width - MARGIN - textWidth : (width - textWidth) / 2
        const y = vpos === 'top' ? height - MARGIN - fontSize : MARGIN
        page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) })
      })

      const outBytes = await pdfDoc.save()
      saveAs(toBlob(outBytes, 'application/pdf'), `${file.name.replace(/\.pdf$/i, '')}-bernomor.pdf`)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menambahkan nomor halaman.'))
    } finally {
      setWorking(false)
    }
  }

  const hAlign = hpos === 'left' ? 'flex-start' : hpos === 'right' ? 'flex-end' : 'center'

  return (
    <ToolShell
      icon="page-numbers"
      title="Nomor Halaman"
      description="Tambahkan nomor halaman otomatis ke semua halaman PDF."
    >
      {!file && (
        <Dropzone accept="application/pdf" onFiles={handleFiles} label="Klik atau drop file PDF di sini" />
      )}

      {file && (
        <div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-ink/[0.03] px-4 py-3.5">
            <p className="truncate font-medium">{file.name}</p>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setPreview(null)
              }}
              className="shrink-0 rounded-full bg-ink/5 px-4 py-1.5 text-sm text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Ganti file
            </button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_minmax(0,18rem)]">
            <div className="space-y-5">
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Posisi</legend>
                <div className="grid max-w-xs grid-cols-3 gap-1.5 rounded-xl bg-ink/[0.03] p-1.5">
                  {(['top', 'bottom'] as VPos[]).flatMap((v) =>
                    (['left', 'center', 'right'] as HPos[]).map((h) => {
                      const active = vpos === v && hpos === h
                      const names = { top: 'atas', bottom: 'bawah', left: 'kiri', center: 'tengah', right: 'kanan' }
                      return (
                        <label
                          key={`${v}-${h}`}
                          className={`flex h-9 cursor-pointer items-center justify-center rounded-lg text-xs transition-colors focus-within:outline-2 focus-within:outline-brand-500 ${
                            active ? 'bg-brand-500 text-on-brand' : 'bg-ground text-ink/55 hover:text-ink'
                          }`}
                        >
                          <input
                            type="radio"
                            name="pos"
                            className="sr-only"
                            checked={active}
                            onChange={() => {
                              setVpos(v)
                              setHpos(h)
                            }}
                            aria-label={`${names[v]} ${names[h]}`}
                          />
                          {names[v]} {names[h]}
                        </label>
                      )
                    }),
                  )}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">Format</legend>
                <div className="flex flex-wrap gap-2">
                  {formats.map((f) => (
                    <label key={f.value} className={`cursor-pointer ${chip(format === f.value)}`}>
                      <input
                        type="radio"
                        name="format"
                        className="sr-only"
                        checked={format === f.value}
                        onChange={() => setFormat(f.value)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label className="flex items-center justify-between text-sm">
                  <span>Ukuran teks</span>
                  <span className="tabular-nums text-ink/50">{fontSize}pt</span>
                </label>
                <input
                  type="range"
                  min={8}
                  max={24}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="flex items-center gap-2 text-sm">
                  Mulai dari
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={startAt}
                    onChange={(e) => setStartAt(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 rounded-lg bg-ink/[0.04] px-3 py-1.5 text-sm tabular-nums outline-none ring-1 ring-transparent focus-visible:ring-brand-500"
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={skipFirst}
                    onChange={(e) => setSkipFirst(e.target.checked)}
                    className="h-4 w-4 accent-brand-500"
                  />
                  Lewati halaman pertama (cover)
                </label>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink/55">Pratinjau halaman 1</p>
              {preview ? (
                <div
                  className="relative overflow-hidden rounded-xl bg-white ring-1 ring-ink/10"
                  style={{ containerType: 'inline-size' }}
                >
                  <img src={preview.dataUrl} alt="Pratinjau halaman pertama" className="block w-full" />
                  {previewLabel && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 flex"
                      style={{
                        justifyContent: hAlign,
                        padding: `0 ${(MARGIN / preview.widthPt) * 100}cqw`,
                        [vpos]: `${(MARGIN / preview.widthPt) * 100}cqw`,
                      }}
                    >
                      <span
                        className="whitespace-nowrap leading-none"
                        style={{
                          fontFamily: 'Helvetica, Arial, sans-serif',
                          fontSize: `${(fontSize / preview.widthPt) * 100}cqw`,
                          color: 'rgb(51,51,51)',
                        }}
                      >
                        {previewLabel}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl bg-ink/[0.03] text-sm text-ink/45">
                  Memuat pratinjau…
                </div>
              )}
              {preview && skipFirst && (
                <p className="mt-2 text-xs text-ink/50">Halaman 1 dilewati, nomor dimulai di halaman 2.</p>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={apply}
            disabled={working || !preview}
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Memproses…' : 'Tambahkan Nomor Halaman'}
          </button>
        </div>
      )}
    </ToolShell>
  )
}
