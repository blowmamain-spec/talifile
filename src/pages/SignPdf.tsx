import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { PDFDocument } from 'pdf-lib'
import { deliver as saveAs } from '../lib/handoff'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import SignaturePad from '../components/SignaturePad'
import DateStamp from '../components/DateStamp'
import { PageNav } from '../lib/pdfPreview'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'

type PagePreview = { width: number; height: number; dataUrl: string }
type Placement = {
  id: string
  leftPct: number
  topPct: number
  widthPct: number
  sig: string
  aspect: number
}
type Drag = { id: string; mode: 'move' | 'resize'; startX: number; startY: number; start: Placement }

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

export default function SignPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [previews, setPreviews] = useState<PagePreview[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [signature, setSignature] = useState<string | null>(null)
  const [placements, setPlacements] = useState<Record<number, Placement[]>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [aspectInfo, setAspectInfo] = useState<{ src: string; aspect: number } | null>(null)
  const [stampKind, setStampKind] = useState<'signature' | 'date'>('signature')
  const [dateStamp, setDateStamp] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)

  // Whatever is placed on the next click: the signature or the date stamp.
  const activeStamp = stampKind === 'date' ? dateStamp : signature
  // The aspect is measured asynchronously; only place once it belongs to the current stamp.
  const sigAspect = activeStamp && aspectInfo?.src === activeStamp ? aspectInfo.aspect : null

  useEffect(() => {
    if (!activeStamp) return
    const img = new Image()
    img.onload = () => setAspectInfo({ src: activeStamp, aspect: img.naturalHeight / img.naturalWidth })
    img.src = activeStamp
  }, [activeStamp])

  async function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    setPreviews([])
    setPlacements({})
    setSelectedId(null)
    setPageIndex(0)
    setError('')
    setLoading(true)
    try {
      const pdfDoc = await loadPdfDocument(f)
      const items: PagePreview[] = []
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const canvas = await renderPageToCanvas(page, 1.2)
        items.push({ width: canvas.width, height: canvas.height, dataUrl: canvas.toDataURL('image/jpeg', 0.85) })
      }
      setPreviews(items)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal membuka PDF. Pastikan file tidak rusak.'))
    } finally {
      setLoading(false)
    }
  }

  // Height of a placement as a fraction of page height (page and preview share an aspect ratio).
  function heightPct(p: { widthPct: number; aspect: number }) {
    const preview = previews[pageIndex]
    return p.widthPct * p.aspect * (preview.width / preview.height)
  }

  function fitWidth(p: Placement, widthPct: number) {
    const maxByHeight = (1 - p.topPct) / heightPct({ widthPct: 1, aspect: p.aspect })
    return clamp(widthPct, 0.05, Math.min(1 - p.leftPct, maxByHeight))
  }

  function updatePlacement(id: string, patch: Partial<Placement>) {
    setPlacements((prev) => ({
      ...prev,
      [pageIndex]: (prev[pageIndex] ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }

  function placeAt(e: React.MouseEvent<HTMLDivElement>) {
    if (!activeStamp || sigAspect === null) return
    const rect = stageRef.current!.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    let widthPct = stampKind === 'date' ? 0.25 : 0.3
    const h = heightPct({ widthPct, aspect: sigAspect })
    if (h > 0.4) widthPct *= 0.4 / h
    const hp = heightPct({ widthPct, aspect: sigAspect })
    const id = `sig-${Date.now()}-${Math.random()}`
    const placement: Placement = {
      id,
      leftPct: clamp(x - widthPct / 2, 0, 1 - widthPct),
      topPct: clamp(y - hp / 2, 0, 1 - hp),
      widthPct,
      sig: activeStamp,
      aspect: sigAspect,
    }
    setPlacements((prev) => ({ ...prev, [pageIndex]: [...(prev[pageIndex] ?? []), placement] }))
    setSelectedId(id)
  }

  function startDrag(p: Placement, mode: Drag['mode']) {
    return (e: ReactPointerEvent<HTMLElement>) => {
      e.stopPropagation()
      e.preventDefault()
      setSelectedId(p.id)
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { id: p.id, mode, startX: e.clientX, startY: e.clientY, start: p }
    }
  }

  function onDrag(e: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag) return
    const rect = stageRef.current!.getBoundingClientRect()
    const dx = (e.clientX - drag.startX) / rect.width
    const dy = (e.clientY - drag.startY) / rect.height
    const s = drag.start
    if (drag.mode === 'move') {
      updatePlacement(drag.id, {
        leftPct: clamp(s.leftPct + dx, 0, 1 - s.widthPct),
        topPct: clamp(s.topPct + dy, 0, 1 - heightPct(s)),
      })
    } else {
      updatePlacement(drag.id, { widthPct: fitWidth(s, s.widthPct + dx) })
    }
  }

  function endDrag() {
    dragRef.current = null
  }

  function updateWidth(id: string, widthPct: number) {
    const p = (placements[pageIndex] ?? []).find((x) => x.id === id)
    if (!p) return
    updatePlacement(id, { widthPct: fitWidth(p, widthPct) })
  }

  function removePlacement(id: string) {
    setPlacements((prev) => ({
      ...prev,
      [pageIndex]: (prev[pageIndex] ?? []).filter((p) => p.id !== id),
    }))
    setSelectedId(null)
  }

  async function downloadSigned() {
    if (!file) return
    setWorking(true)
    setError('')
    try {
      const bytes = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(bytes)
      const embedded = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedPng>>>()

      for (const [idxStr, pagePlacements] of Object.entries(placements)) {
        const idx = Number(idxStr)
        const page = pdfDoc.getPages()[idx]
        if (!page) continue
        const { width: pw, height: ph } = page.getSize()

        for (const placement of pagePlacements) {
          let sigImage = embedded.get(placement.sig)
          if (!sigImage) {
            // pdf-lib reads the data: URL itself; fetch() on data: URLs is blocked by our CSP.
            sigImage = await pdfDoc.embedPng(placement.sig)
            embedded.set(placement.sig, sigImage)
          }
          const sigAspect = sigImage.height / sigImage.width
          const sigWidth = placement.widthPct * pw
          const sigHeight = sigWidth * sigAspect
          const x = placement.leftPct * pw
          const yTop = placement.topPct * ph
          const y = ph - yTop - sigHeight
          page.drawImage(sigImage, { x, y, width: sigWidth, height: sigHeight })
        }
      }

      const outBytes = await pdfDoc.save()
      saveAs(
        toBlob(outBytes, 'application/pdf'),
        `${file.name.replace(/\.pdf$/i, '')}-signed.pdf`,
      )
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menyimpan PDF yang ditandatangani.'))
    } finally {
      setWorking(false)
    }
  }

  const currentPreview = previews[pageIndex]
  const currentPlacements = placements[pageIndex] ?? []
  const selected = currentPlacements.find((p) => p.id === selectedId) ?? null
  const totalCount = Object.values(placements).reduce((sum, list) => sum + list.length, 0)
  const signedPageCount = Object.values(placements).filter((list) => list.length > 0).length

  return (
    <ToolShell
      icon="sign-pdf"
      title="Sign PDF"
      description="Gambar, ketik, atau upload tanda tangan, lalu klik di halaman untuk menempatkannya. Bisa tambah tanggal juga, dan lebih dari satu per halaman."
    >
      {!file && (
        <Dropzone
          accept="application/pdf"
          onFiles={handleFiles}
          label="Klik atau drop file PDF di sini"
        />
      )}

      {loading && <p className="mt-4 text-sm text-muted">Membuka PDF…</p>}
      {error && (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {file && currentPreview && (
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            <PageNav
              index={pageIndex}
              count={previews.length}
              onChange={(i) => {
                setPageIndex(i)
                setSelectedId(null)
              }}
              extra={currentPlacements.length > 0 ? `${currentPlacements.length} ditempel` : undefined}
            />

            <div
              ref={stageRef}
              onClick={placeAt}
              className={`relative overflow-hidden rounded-xl ring-1 ring-ink/10 ${
                activeStamp ? 'cursor-crosshair' : ''
              }`}
            >
              <img
                src={currentPreview.dataUrl}
                alt={`Pratinjau halaman ${pageIndex + 1} dari ${previews.length}`}
                className="w-full select-none"
                draggable={false}
              />
              {currentPlacements.map((p) => (
                <div
                  key={p.id}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={startDrag(p, 'move')}
                  onPointerMove={onDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className={`absolute cursor-move touch-none select-none outline-2 outline-offset-2 ${
                    p.id === selectedId ? 'outline-brand-500' : 'outline-transparent hover:outline-brand-500/40'
                  }`}
                  style={{
                    left: `${p.leftPct * 100}%`,
                    top: `${p.topPct * 100}%`,
                    width: `${p.widthPct * 100}%`,
                  }}
                >
                  <img src={p.sig} alt="" draggable={false} className="pointer-events-none block w-full" />
                  {p.id === selectedId && (
                    <span
                      onPointerDown={startDrag(p, 'resize')}
                      onPointerMove={onDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      aria-hidden="true"
                      className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize touch-none rounded-full bg-brand-500 ring-2 ring-white"
                    />
                  )}
                </div>
              ))}
            </div>
            {!activeStamp && (
              <p className="mt-2 text-sm text-muted">
                {stampKind === 'date'
                  ? 'Pilih tanggal dulu di panel kanan.'
                  : 'Siapkan tanda tangan dulu di panel kanan.'}
              </p>
            )}
            {activeStamp && (
              <p className="mt-2 text-sm text-muted">
                Klik di halaman untuk menempel {stampKind === 'date' ? 'tanggal' : 'tanda tangan'}.
                Seret untuk memindahkan, tarik titik hijau di pojok untuk mengubah ukuran.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-surface ring-1 ring-ink/10 p-4">
              <p className="mb-2 text-sm font-medium">Yang mau ditempel</p>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {(
                  [
                    ['signature', 'Tanda tangan'],
                    ['date', 'Tanggal'],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setStampKind(kind)}
                    aria-pressed={stampKind === kind}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                      stampKind === kind
                        ? 'bg-brand-500 text-on-brand'
                        : 'bg-ground text-ink/65 ring-1 ring-ink/10 hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Both stay mounted so switching tabs keeps a drawn signature. */}
              <div className={stampKind === 'signature' ? '' : 'hidden'}>
                <SignaturePad onChange={setSignature} />
              </div>
              <div className={stampKind === 'date' ? '' : 'hidden'}>
                <DateStamp onChange={setDateStamp} />
              </div>
            </div>

            {selected && (
              <div className="rounded-xl bg-surface ring-1 ring-ink/10 p-4">
                <label className="flex items-center justify-between text-sm">
                  <span>Ukuran</span>
                  <span className="tabular-nums text-muted">
                    {Math.round(selected.widthPct * 100)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={0.7}
                  step={0.02}
                  value={selected.widthPct}
                  onChange={(e) => updateWidth(selected.id, Number(e.target.value))}
                  className="mt-2 w-full accent-brand-500"
                />
                <button
                  type="button"
                  onClick={() => removePlacement(selected.id)}
                  className="mt-3 min-h-11 w-full rounded-full bg-surface px-3 text-sm font-medium text-danger ring-1 ring-ink/15 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  Hapus yang dipilih
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={downloadSigned}
              disabled={working || totalCount === 0}
              className="w-full inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {working
                ? 'Menyimpan…'
                : `Download PDF (${totalCount} item, ${signedPageCount} halaman)`}
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
