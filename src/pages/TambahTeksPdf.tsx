import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, Chips, ErrorText, FileBar, Panel, Slider } from '../components/ui'
import { PageNav, usePagePreview, usePdfDoc } from '../lib/pdfPreview'
import { deliver } from '../lib/handoff'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'

type Color = 'hitam' | 'biru' | 'merah'
type Box = { id: string; page: number; leftPct: number; topPct: number; text: string; size: number; color: Color; bold: boolean }

const colors: Record<Color, [number, number, number]> = { hitam: [0.07, 0.07, 0.07], biru: [0.08, 0.25, 0.65], merah: [0.75, 0.1, 0.12] }
const css = (c: Color) => `rgb(${colors[c].map((v) => Math.round(v * 255)).join(',')})`
const LINE = 1.2
// Distance from the top of a CSS line box to the baseline for Helvetica/Arial at line-height 1.2.
const BASELINE = 0.947

/** Helvetica covers Latin-1; anything else (emoji, CJK) would make pdf-lib throw, so it becomes "?". */
function safeText(font: PDFFont, text: string) {
  return [...text]
    .map((ch) => {
      try {
        font.encodeText(ch)
        return ch
      } catch {
        return '?'
      }
    })
    .join('')
}

export default function TambahTeksPdf() {
  const [file, setFile] = useState<File | null>(null)
  const { doc, error: loadError } = usePdfDoc(file)
  const [page, setPage] = useState(0)
  const preview = usePagePreview(doc, page)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; x: number; y: number; left: number; top: number; moved: boolean } | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const current = boxes.find((b) => b.id === selected) ?? null
  const update = (id: string, patch: Partial<Box>) => setBoxes((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  function addAt(e: React.MouseEvent<HTMLDivElement>) {
    const r = stageRef.current!.getBoundingClientRect()
    const box: Box = {
      id: `t-${Date.now()}`,
      page,
      leftPct: (e.clientX - r.left) / r.width,
      topPct: (e.clientY - r.top) / r.height,
      text: '',
      size: current?.size ?? 12,
      color: current?.color ?? 'hitam',
      bold: false,
    }
    setBoxes((bs) => [...bs, box])
    setSelected(box.id)
    setTimeout(() => textRef.current?.focus(), 0)
  }

  function down(b: Box) {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      setSelected(b.id)
      dragRef.current = { id: b.id, x: e.clientX, y: e.clientY, left: b.leftPct, top: b.topPct, moved: false }
    }
  }

  function move(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d) return
    const r = stageRef.current!.getBoundingClientRect()
    const dx = (e.clientX - d.x) / r.width
    const dy = (e.clientY - d.y) / r.height
    if (Math.abs(dx) + Math.abs(dy) > 0.002) d.moved = true
    update(d.id, { leftPct: Math.min(Math.max(d.left + dx, 0), 0.98), topPct: Math.min(Math.max(d.top + dy, 0), 0.98) })
  }

  async function save() {
    if (!file) return
    setWorking(true)
    setError('')
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer())
      const regular = await pdf.embedFont(StandardFonts.Helvetica)
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
      const pages = pdf.getPages()
      for (const b of boxes) {
        if (!b.text.trim()) continue
        const p = pages[b.page]
        const { width, height } = p.getSize()
        const font = b.bold ? bold : regular
        const lines = b.text.split('\n').map((l) => safeText(font, l))
        lines.forEach((line, i) => {
          p.drawText(line, {
            x: b.leftPct * width,
            y: height - b.topPct * height - BASELINE * b.size - i * LINE * b.size,
            size: b.size,
            font,
            color: rgb(...colors[b.color]),
          })
        })
      }
      deliver(toBlob(await pdf.save(), 'application/pdf'), `${file.name.replace(/\.pdf$/i, '')}-ditulis.pdf`)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menyimpan PDF.'))
    } finally {
      setWorking(false)
    }
  }

  const onPage = boxes.filter((b) => b.page === page)
  const filled = boxes.filter((b) => b.text.trim()).length

  return (
    <ToolShell icon="tambah-teks-pdf" title="Tulis di PDF" description="Klik di mana saja pada halaman untuk menulis. Cocok untuk mengisi formulir yang tidak punya kolom isian.">
      {!file && <Dropzone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Pilih file PDF" />}
      <ErrorText>{loadError}</ErrorText>

      {file && doc && (
        <div>
          <FileBar name={file.name} onChange={() => { setFile(null); setBoxes([]); setPage(0) }} />
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_17rem]">
            <div>
              <PageNav index={page} count={doc.numPages} onChange={(i) => { setPage(i); setSelected(null) }} extra={onPage.length ? `${onPage.length} teks` : undefined} />
              {preview ? (
                <div ref={stageRef} onClick={addAt} className="relative cursor-text overflow-hidden rounded-xl bg-white ring-1 ring-ink/15" style={{ containerType: 'inline-size' }}>
                  <img src={preview.dataUrl} alt={`Halaman ${page + 1}`} draggable={false} className="block w-full select-none" />
                  {onPage.map((b) => (
                    <div
                      key={b.id}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={down(b)}
                      onPointerMove={move}
                      onPointerUp={() => (dragRef.current = null)}
                      className={`absolute cursor-move touch-none whitespace-pre outline-dashed outline-1 outline-offset-2 ${b.id === selected ? 'outline-brand-500' : 'outline-transparent hover:outline-ink/30'}`}
                      style={{
                        left: `${b.leftPct * 100}%`,
                        top: `${b.topPct * 100}%`,
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        fontSize: `${(b.size / preview.widthPt) * 100}cqw`,
                        lineHeight: LINE,
                        fontWeight: b.bold ? 700 : 400,
                        color: css(b.color),
                      }}
                    >
                      {b.text || <span className="text-gray-400">Ketik teks…</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-96 items-center justify-center rounded-xl bg-surface text-sm text-muted ring-1 ring-ink/10">Memuat halaman…</div>
              )}
              <p className="mt-2 text-sm text-muted">Klik di halaman untuk menambah teks. Seret teks untuk memindahkan.</p>
            </div>

            <div className="space-y-4">
              {current ? (
                <Panel className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium">Isi teks</span>
                    <textarea
                      ref={textRef}
                      value={current.text}
                      onChange={(e) => update(current.id, { text: e.target.value })}
                      rows={3}
                      placeholder="Tulis di sini. Enter untuk baris baru."
                      className="mt-1.5 w-full resize-y rounded-lg bg-ground px-3 py-2 text-sm outline-none ring-1 ring-ink/15 focus-visible:ring-2 focus-visible:ring-brand-500"
                    />
                  </label>
                  <Slider label="Ukuran" value={current.size} display={`${current.size} pt`} min={6} max={36} onChange={(v) => update(current.id, { size: v })} />
                  <Chips name="color" legend="Warna" value={current.color} onChange={(v) => update(current.id, { color: v })} options={[{ value: 'hitam', label: 'Hitam' }, { value: 'biru', label: 'Biru' }, { value: 'merah', label: 'Merah' }]} />
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={current.bold} onChange={(e) => update(current.id, { bold: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                    Tebal
                  </label>
                  <Button variant="danger" className="w-full" onClick={() => { setBoxes((bs) => bs.filter((b) => b.id !== current.id)); setSelected(null) }}>
                    Hapus teks ini
                  </Button>
                </Panel>
              ) : (
                <Panel className="text-sm text-muted">Belum ada teks yang dipilih. Klik di halaman untuk mulai menulis.</Panel>
              )}
              <ErrorText>{error}</ErrorText>
              <Button onClick={save} disabled={working || filled === 0} className="w-full">
                {working ? 'Menyimpan…' : filled ? `Download PDF (${filled} teks)` : 'Tulis sesuatu dulu'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
