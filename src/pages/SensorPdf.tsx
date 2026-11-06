import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import RectEditor from '../components/RectEditor'
import type { Rect } from '../components/RectEditor'
import { Button, ErrorText, FileBar, Panel } from '../components/ui'
import { PageNav, usePagePreview, usePdfDoc } from '../lib/pdfPreview'
import { renderPageToCanvas } from '../lib/pdfjs'
import { deliver } from '../lib/handoff'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'
import { canvasToBlob } from '../components/ui'

export default function SensorPdf() {
  const [file, setFile] = useState<File | null>(null)
  const { doc, error: loadError } = usePdfDoc(file)
  const [page, setPage] = useState(0)
  const preview = usePagePreview(doc, page)
  const [rects, setRects] = useState<Record<number, Rect[]>>({})
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const redactedPages = Object.entries(rects).filter(([, r]) => r.length).map(([i]) => Number(i))
  const total = redactedPages.reduce((n, i) => n + rects[i].length, 0)

  async function save() {
    if (!file || !doc) return
    setWorking(true)
    setError('')
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer())
      for (const [k, i] of redactedPages.entries()) {
        setProgress(`${k + 1}/${redactedPages.length}`)
        // Covering text with a box leaves it copyable underneath. Flattening the page to pixels removes it for real.
        const p = await doc.getPage(i + 1)
        const vp = p.getViewport({ scale: 1 })
        const canvas = await renderPageToCanvas(p, 2.5)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#000'
        for (const r of rects[i]) ctx.fillRect(r.x * canvas.width, r.y * canvas.height, r.w * canvas.width, r.h * canvas.height)
        const jpg = await pdf.embedJpg(await (await canvasToBlob(canvas, 'image/jpeg', 0.9)).arrayBuffer())
        pdf.removePage(i)
        const np = pdf.insertPage(i, [vp.width, vp.height])
        np.drawImage(jpg, { x: 0, y: 0, width: vp.width, height: vp.height })
      }
      deliver(toBlob(await pdf.save(), 'application/pdf'), `${file.name.replace(/\.pdf$/i, '')}-disensor.pdf`)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menyimpan PDF.'))
    } finally {
      setWorking(false)
      setProgress('')
    }
  }

  return (
    <ToolShell icon="sensor-pdf" title="Sensor PDF" description="Hitamkan NIK, nomor rekening, atau bagian rahasia lain. Isinya ikut terhapus, bukan sekadar ditutupi.">
      {!file && <Dropzone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Pilih file PDF" />}
      <ErrorText>{loadError}</ErrorText>

      {file && doc && (
        <div>
          <FileBar name={file.name} onChange={() => { setFile(null); setRects({}); setPage(0) }} />
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_17rem]">
            <div>
              <PageNav index={page} count={doc.numPages} onChange={setPage} extra={rects[page]?.length ? `${rects[page].length} area` : undefined} />
              {preview ? (
                <RectEditor src={preview.dataUrl} alt={`Halaman ${page + 1}`} rects={rects[page] ?? []} onChange={(r) => setRects((all) => ({ ...all, [page]: r }))} />
              ) : (
                <div className="flex h-96 items-center justify-center rounded-xl bg-surface text-sm text-muted ring-1 ring-ink/10">Memuat halaman…</div>
              )}
              <p className="mt-2 text-sm text-muted">Tarik kotak di atas bagian yang mau dihitamkan.</p>
            </div>
            <div className="space-y-4">
              <Panel className="text-sm text-muted">
                Halaman yang disensor disimpan sebagai gambar, jadi teks di halaman itu tidak bisa disalin lagi. Halaman lain tetap seperti aslinya.
              </Panel>
              <ErrorText>{error}</ErrorText>
              <Button onClick={save} disabled={working || total === 0} className="w-full">
                {working ? `Memproses ${progress}…` : total ? `Download (${total} area, ${redactedPages.length} halaman)` : 'Tandai area dulu'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
