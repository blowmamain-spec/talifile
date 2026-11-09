import { useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, ErrorText, FileBar } from '../components/ui'
import { CropFrame } from '../components/ResizableBox'
import { usePagePreview, usePdfDoc } from '../lib/pdfPreview'
import { renderPageToCanvas } from '../lib/pdfjs'
import { deliver } from '../lib/handoff'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'

type Margins = { top: number; right: number; bottom: number; left: number }
const zero: Margins = { top: 0, right: 0, bottom: 0, left: 0 }

/** Maps margins as seen on screen to the page's unrotated sides, since a /Rotate 90 page shows its left edge on top. */
function toUnrotated(m: Margins, angle: number): Margins {
  if (angle === 90) return { left: m.top, top: m.right, right: m.bottom, bottom: m.left }
  if (angle === 180) return { top: m.bottom, bottom: m.top, left: m.right, right: m.left }
  if (angle === 270) return { right: m.top, bottom: m.right, left: m.bottom, top: m.left }
  return m
}

export default function CropPdf() {
  const [file, setFile] = useState<File | null>(null)
  const { doc, error: loadError } = usePdfDoc(file)
  const preview = usePagePreview(doc, 0)
  const [m, setM] = useState<Margins>(zero)
  const [working, setWorking] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)

  // Finds the first non-white rows/columns on page 1 and leaves a small breathing gap.
  async function autoDetect() {
    if (!doc) return
    setDetecting(true)
    try {
      const canvas = await renderPageToCanvas(await doc.getPage(1), 0.6)
      const { width: W, height: H } = canvas
      const data = canvas.getContext('2d')!.getImageData(0, 0, W, H).data
      const ink = (x: number, y: number) => {
        const k = (y * W + x) * 4
        return data[k] < 235 || data[k + 1] < 235 || data[k + 2] < 235
      }
      let top = 0, bottom = H - 1, left = 0, right = W - 1
      const rowHas = (y: number) => { for (let x = 0; x < W; x++) if (ink(x, y)) return true; return false }
      const colHas = (x: number) => { for (let y = 0; y < H; y++) if (ink(x, y)) return true; return false }
      while (top < H && !rowHas(top)) top++
      while (bottom > top && !rowHas(bottom)) bottom--
      while (left < W && !colHas(left)) left++
      while (right > left && !colHas(right)) right--
      if (top >= H) {
        setError('Halaman pertama kosong, margin tidak bisa dideteksi.')
        return
      }
      const gap = 0.02
      setM({
        top: Math.max(0, top / H - gap),
        bottom: Math.max(0, (H - 1 - bottom) / H - gap),
        left: Math.max(0, left / W - gap),
        right: Math.max(0, (W - 1 - right) / W - gap),
      })
    } finally {
      setDetecting(false)
    }
  }

  async function run() {
    if (!file) return
    setWorking(true)
    setError('')
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer())
      for (const p of pdf.getPages()) {
        const box = p.getMediaBox()
        const angle = ((p.getRotation().angle % 360) + 360) % 360
        const u = toUnrotated(m, angle)
        const x = box.x + u.left * box.width
        const y = box.y + u.bottom * box.height
        const w = box.width * (1 - u.left - u.right)
        const h = box.height * (1 - u.top - u.bottom)
        p.setCropBox(x, y, w, h)
        p.setTrimBox(x, y, w, h)
      }
      deliver(toBlob(await pdf.save(), 'application/pdf'), `${file.name.replace(/\.pdf$/i, '')}-crop.pdf`)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal memotong PDF.'))
    } finally {
      setWorking(false)
    }
  }

  const pct = (v: number) => `${Math.round(v * 100)}%`
  const changed = m.top + m.right + m.bottom + m.left > 0

  return (
    <ToolShell icon="crop-pdf" title="Crop PDF" description="Potong margin putih yang terlalu lebar. Potongan yang sama dipakai di semua halaman.">
      {!file && <Dropzone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Pilih file PDF" />}
      <ErrorText>{loadError}</ErrorText>
      {file && doc && (
        <div>
          <FileBar name={file.name} onChange={() => { setFile(null); setM(zero) }} />
          <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr]">
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Pratinjau halaman 1</p>
              {preview ? (
                <div ref={stageRef} className="relative select-none rounded-xl bg-white ring-1 ring-ink/15">
                  <img src={preview.dataUrl} alt="Halaman pertama" draggable={false} className="block w-full rounded-xl" />
                  <CropFrame
                    stageRef={stageRef}
                    rect={{ x: m.left, y: m.top, w: 1 - m.left - m.right, h: 1 - m.top - m.bottom }}
                    onChange={(r) => setM({ left: r.x, top: r.y, right: 1 - r.x - r.w, bottom: 1 - r.y - r.h })}
                  />
                </div>
              ) : (
                <div className="flex h-80 items-center justify-center rounded-xl bg-surface text-sm text-muted ring-1 ring-ink/10">Memuat halaman…</div>
              )}
            </div>
            <div className="space-y-5">
              <Button variant="secondary" onClick={autoDetect} disabled={detecting || !preview}>
                {detecting ? 'Mendeteksi…' : 'Deteksi margin otomatis'}
              </Button>
              <p className="text-sm text-muted">Tarik titik di sisi atau pojok kotak pada pratinjau. Potongan yang sama dipakai di semua halaman.</p>
              <dl className="grid grid-cols-2 gap-2 text-sm tabular-nums">
                {(['top', 'bottom', 'left', 'right'] as const).map((k) => (
                  <div key={k} className="rounded-lg bg-surface px-3 py-2 ring-1 ring-ink/10">
                    <dt className="text-xs text-muted">{{ top: 'Atas', bottom: 'Bawah', left: 'Kiri', right: 'Kanan' }[k]}</dt>
                    <dd className="font-medium">{pct(m[k])}</dd>
                  </div>
                ))}
              </dl>
              <ErrorText>{error}</ErrorText>
              <div className="flex flex-wrap gap-3">
                <Button onClick={run} disabled={working || !changed}>{working ? 'Memotong…' : changed ? 'Potong & download' : 'Atur margin dulu'}</Button>
                <Button variant="secondary" onClick={() => setM(zero)} disabled={!changed}>Reset</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
