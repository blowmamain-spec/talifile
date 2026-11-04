import { useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { saveAs } from 'file-saver'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import SignaturePad from '../components/SignaturePad'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'

type PagePreview = { width: number; height: number; dataUrl: string }
type Placement = { id: string; leftPct: number; topPct: number; widthPct: number; sig: string }

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
  const stageRef = useRef<HTMLDivElement>(null)

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

  function placeAt(e: React.MouseEvent<HTMLDivElement>) {
    if (!signature) return
    const rect = stageRef.current!.getBoundingClientRect()
    const leftPct = (e.clientX - rect.left) / rect.width
    const topPct = (e.clientY - rect.top) / rect.height
    const widthPct = 0.3
    const id = `sig-${Date.now()}-${Math.random()}`
    const placement: Placement = {
      id,
      leftPct: Math.min(Math.max(leftPct - widthPct / 2, 0), 1 - widthPct),
      topPct: Math.min(Math.max(topPct - 0.05, 0), 0.95),
      widthPct,
      sig: signature,
    }
    setPlacements((prev) => ({ ...prev, [pageIndex]: [...(prev[pageIndex] ?? []), placement] }))
    setSelectedId(id)
  }

  function selectPlacement(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setSelectedId(id)
  }

  function updateWidth(id: string, widthPct: number) {
    setPlacements((prev) => ({
      ...prev,
      [pageIndex]: (prev[pageIndex] ?? []).map((p) => (p.id === id ? { ...p, widthPct } : p)),
    }))
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
            const sigBytes = await (await fetch(placement.sig)).arrayBuffer()
            sigImage = await pdfDoc.embedPng(sigBytes)
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
      description="Gambar, ketik, atau upload tanda tangan, lalu klik di halaman untuk menempatkannya. Bisa lebih dari satu per halaman."
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

      {file && currentPreview && (
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPageIndex((i) => Math.max(0, i - 1))
                  setSelectedId(null)
                }}
                disabled={pageIndex === 0}
                className="rounded-full bg-ink/5 px-3 py-1 text-sm text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink disabled:opacity-30 disabled:hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                ← Sebelumnya
              </button>
              <p className="text-sm tabular-nums text-ink/50" aria-live="polite">
                Halaman {pageIndex + 1} / {previews.length}
                {currentPlacements.length > 0 && ` · ${currentPlacements.length} tanda tangan`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPageIndex((i) => Math.min(previews.length - 1, i + 1))
                  setSelectedId(null)
                }}
                disabled={pageIndex === previews.length - 1}
                className="rounded-full bg-ink/5 px-3 py-1 text-sm text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink disabled:opacity-30 disabled:hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Berikutnya →
              </button>
            </div>

            <div
              ref={stageRef}
              onClick={placeAt}
              className={`relative overflow-hidden rounded-xl ring-1 ring-ink/10 ${
                signature ? 'cursor-crosshair' : ''
              }`}
            >
              <img
                src={currentPreview.dataUrl}
                alt={`Pratinjau halaman ${pageIndex + 1} dari ${previews.length}`}
                className="w-full select-none"
                draggable={false}
              />
              {currentPlacements.map((p) => (
                <img
                  key={p.id}
                  src={p.sig}
                  alt=""
                  onClick={(e) => selectPlacement(e, p.id)}
                  className={`absolute cursor-pointer outline-2 outline-offset-2 ${
                    p.id === selectedId ? 'outline-brand-500' : 'outline-transparent hover:outline-brand-500/40'
                  }`}
                  style={{
                    left: `${p.leftPct * 100}%`,
                    top: `${p.topPct * 100}%`,
                    width: `${p.widthPct * 100}%`,
                  }}
                />
              ))}
            </div>
            {!signature && (
              <p className="mt-2 text-sm text-ink/50">Siapkan tanda tangan dulu di panel kanan.</p>
            )}
            {signature && (
              <p className="mt-2 text-sm text-ink/50">
                Klik di halaman untuk menambah tanda tangan. Klik tanda tangan yang sudah ada buat
                atur ukuran atau hapus.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-ink/[0.03] p-4">
              <p className="mb-2 text-sm font-medium">Tanda tangan</p>
              <SignaturePad onChange={setSignature} />
            </div>

            {selected && (
              <div className="rounded-xl bg-ink/[0.03] p-4">
                <label className="flex items-center justify-between text-sm">
                  <span>Ukuran</span>
                  <span className="tabular-nums text-ink/50">
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
                  className="mt-3 w-full rounded-full bg-ink/5 px-3 py-1.5 text-sm text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  Hapus tanda tangan ini
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={downloadSigned}
              disabled={working || totalCount === 0}
              className="w-full rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {working
                ? 'Menyimpan…'
                : `Download PDF (${totalCount} tanda tangan, ${signedPageCount} halaman)`}
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
