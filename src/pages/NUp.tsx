import { useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, Chips, ErrorText, FileBar } from '../components/ui'
import { deliver } from '../lib/handoff'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'
import { drawUpright, uprightSize } from '../lib/pdfPreview'

type Per = 2 | 4
const A4 = { w: 595.28, h: 841.89 }

export default function NUp() {
  const [file, setFile] = useState<File | null>(null)
  const [per, setPer] = useState<Per>(2)
  const [border, setBorder] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (!file) return
    setWorking(true)
    setError('')
    try {
      const src = await PDFDocument.load(await file.arrayBuffer())
      const out = await PDFDocument.create()
      const srcPages = src.getPages()
      const embedded = await out.embedPages(srcPages)
      // 2 per sheet: landscape A4, side by side. 4 per sheet: portrait A4, 2 x 2. Both keep each page at a readable size.
      const [sw, sh] = per === 2 ? [A4.h, A4.w] : [A4.w, A4.h]
      const cols = 2
      const rows = per === 2 ? 1 : 2
      const pad = 14
      const cellW = (sw - pad * (cols + 1)) / cols
      const cellH = (sh - pad * (rows + 1)) / rows
      for (let start = 0; start < srcPages.length; start += per) {
        const sheet = out.addPage([sw, sh])
        for (let k = 0; k < per && start + k < srcPages.length; k++) {
          const sp = srcPages[start + k]
          const { width: uw, height: uh, angle } = uprightSize(sp)
          const { width: w, height: h } = sp.getSize()
          const col = k % cols
          const row = Math.floor(k / cols)
          const cx = pad + col * (cellW + pad)
          const cy = sh - pad - (row + 1) * cellH - row * pad
          const s = Math.min(cellW / uw, cellH / uh)
          const x = cx + (cellW - uw * s) / 2
          const y = cy + (cellH - uh * s) / 2
          drawUpright(sheet, embedded[start + k], x, y, s, angle, w, h)
          if (border) sheet.drawRectangle({ x, y, width: uw * s, height: uh * s, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5 })
        }
      }
      deliver(toBlob(await out.save(), 'application/pdf'), `${file.name.replace(/\.pdf$/i, '')}-${per}-per-lembar.pdf`)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menyusun halaman.'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell icon="n-up" title="Beberapa Halaman per Lembar" description="Susun 2 atau 4 halaman PDF dalam satu lembar A4 supaya hemat kertas saat dicetak, misalnya untuk slide kuliah.">
      {!file && <Dropzone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Pilih file PDF" />}
      {file && (
        <div className="space-y-6">
          <FileBar name={file.name} onChange={() => setFile(null)} />
          <Chips name="per" legend="Halaman per lembar" value={per} onChange={setPer} options={[{ value: 2, label: '2 halaman (lanskap)' }, { value: 4, label: '4 halaman (potret)' }]} />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={border} onChange={(e) => setBorder(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Beri garis tipis di sekeliling tiap halaman
          </label>
          <ErrorText>{error}</ErrorText>
          <Button onClick={run} disabled={working}>{working ? 'Menyusun…' : 'Susun & download'}</Button>
        </div>
      )}
    </ToolShell>
  )
}
