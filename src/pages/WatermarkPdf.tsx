import { useState } from 'react'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import { saveAs } from 'file-saver'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'

type Preview = { dataUrl: string; widthPt: number; heightPt: number }

export default function WatermarkPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('CONTOH')
  const [fontSize, setFontSize] = useState(48)
  const [opacity, setOpacity] = useState(0.25)
  const [angle, setAngle] = useState(-45)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)

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
      })
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal membuka PDF. Pastikan file tidak rusak.'))
    }
  }

  async function apply() {
    if (!file || !text.trim()) return
    setWorking(true)
    setError('')
    try {
      const bytes = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(bytes)
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      // Offset from the text's draw origin (baseline-left) to its visual center.
      const dx = textWidth / 2
      const dy = fontSize * 0.35
      const rad = (angle * Math.PI) / 180

      for (const page of pdfDoc.getPages()) {
        const { width, height } = page.getSize()
        // Solve for the draw origin so the text's center lands on the page center after rotation.
        const x = width / 2 - (dx * Math.cos(rad) - dy * Math.sin(rad))
        const y = height / 2 - (dx * Math.sin(rad) + dy * Math.cos(rad))
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.4, 0.4, 0.4),
          opacity,
          rotate: degrees(angle),
        })
      }

      const outBytes = await pdfDoc.save()
      saveAs(
        toBlob(outBytes, 'application/pdf'),
        `${file.name.replace(/\.pdf$/i, '')}-watermark.pdf`,
      )
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menambahkan watermark.'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell
      icon="watermark-pdf"
      title="Watermark PDF"
      description="Tambahkan teks watermark ke semua halaman PDF."
    >
      {!file && (
        <Dropzone
          accept="application/pdf"
          onFiles={handleFiles}
          label="Klik atau drop file PDF di sini"
        />
      )}

      {file && (
        <div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-ink/[0.03] px-4 py-3.5">
            <p className="truncate font-medium">{file.name}</p>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="shrink-0 rounded-full bg-ink/5 px-4 py-1.5 text-sm text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Ganti file
            </button>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="watermark-text" className="text-sm font-medium">
                Teks watermark
              </label>
              <input
                id="watermark-text"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                className="mt-1.5 w-full rounded-lg bg-ink/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-transparent focus-visible:ring-brand-500"
                placeholder="mis. RAHASIA, DRAFT, COPY"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-sm">
                <span>Ukuran teks</span>
                <span className="tabular-nums text-ink/50">{fontSize}px</span>
              </label>
              <input
                type="range"
                min={16}
                max={120}
                step={2}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="mt-2 w-full accent-brand-500"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-sm">
                <span>Transparansi</span>
                <span className="tabular-nums text-ink/50">{Math.round(opacity * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.05}
                max={0.8}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="mt-2 w-full accent-brand-500"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-sm">
                <span>Rotasi</span>
                <span className="tabular-nums text-ink/50">{angle}°</span>
              </label>
              <input
                type="range"
                min={-90}
                max={90}
                step={5}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="mt-2 w-full accent-brand-500"
              />
            </div>
          </div>

          <p className="mt-6 mb-2 text-sm font-medium text-ink/55">Pratinjau halaman 1</p>
          {preview ? (
            <div
              className="relative mx-auto max-w-sm overflow-hidden rounded-xl bg-white ring-1 ring-ink/10"
              style={{ containerType: 'inline-size' }}
            >
              <img src={preview.dataUrl} alt="Pratinjau halaman pertama" className="block w-full" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 select-none whitespace-nowrap font-bold leading-none"
                style={{
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  // Scale PDF points to the rendered preview width.
                  fontSize: `${(fontSize / preview.widthPt) * 100}cqw`,
                  color: 'rgb(102,102,102)',
                  opacity,
                  transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
                }}
              >
                {text || 'CONTOH'}
              </span>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl bg-ink/[0.03] text-sm text-ink/45">
              Memuat pratinjau…
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={apply}
            disabled={working || !text.trim()}
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Memproses…' : 'Tambahkan Watermark'}
          </button>
        </div>
      )}
    </ToolShell>
  )
}
