import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, Chips, ErrorText, FileBar } from '../components/ui'
import { deliver } from '../lib/handoff'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'
import { drawUpright, uprightSize } from '../lib/pdfPreview'

type Paper = 'a4' | 'f4' | 'letter' | 'legal'
type Orient = 'ikut' | 'potret' | 'lanskap'

const mm = (v: number) => (v / 25.4) * 72
// F4 here is the Indonesian "folio" (215 x 330 mm), not the ISO-adjacent 210 x 330.
const papers: Record<Paper, { label: string; w: number; h: number }> = {
  a4: { label: 'A4', w: mm(210), h: mm(297) },
  f4: { label: 'F4 / Folio', w: mm(215), h: mm(330) },
  letter: { label: 'Letter', w: 612, h: 792 },
  legal: { label: 'Legal', w: 612, h: 1008 },
}

export default function UkuranHalaman() {
  const [file, setFile] = useState<File | null>(null)
  const [paper, setPaper] = useState<Paper>('a4')
  const [orient, setOrient] = useState<Orient>('ikut')
  const [margin, setMargin] = useState(0)
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
      srcPages.forEach((sp, i) => {
        const { width: uw, height: uh, angle } = uprightSize(sp)
        const { width: w, height: h } = sp.getSize()
        const landscape = orient === 'lanskap' || (orient === 'ikut' && uw > uh)
        const P = papers[paper]
        const [pw, ph] = landscape ? [P.h, P.w] : [P.w, P.h]
        const m = mm(margin)
        // Fit inside the paper without stretching, centered.
        const s = Math.min((pw - 2 * m) / uw, (ph - 2 * m) / uh)
        const page = out.addPage([pw, ph])
        drawUpright(page, embedded[i], (pw - uw * s) / 2, (ph - uh * s) / 2, s, angle, w, h)
      })
      deliver(toBlob(await out.save(), 'application/pdf'), `${file.name.replace(/\.pdf$/i, '')}-${paper}.pdf`)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal mengubah ukuran halaman.'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell icon="ukuran-halaman" title="Ubah Ukuran Halaman" description="Seragamkan semua halaman ke satu ukuran kertas. Isi halaman diperkecil atau diperbesar tanpa gepeng.">
      {!file && <Dropzone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Pilih file PDF" />}
      {file && (
        <div className="space-y-6">
          <FileBar name={file.name} onChange={() => setFile(null)} />
          <Chips name="paper" legend="Ukuran kertas" value={paper} onChange={setPaper} options={(Object.keys(papers) as Paper[]).map((p) => ({ value: p, label: papers[p].label }))} />
          <Chips
            name="orient"
            legend="Orientasi"
            value={orient}
            onChange={setOrient}
            options={[
              { value: 'ikut', label: 'Ikut halaman asli' },
              { value: 'potret', label: 'Semua potret' },
              { value: 'lanskap', label: 'Semua lanskap' },
            ]}
          />
          <Chips name="margin" legend="Margin tambahan" value={margin} onChange={setMargin} options={[0, 5, 10, 20].map((v) => ({ value: v, label: v ? `${v} mm` : 'Tanpa' }))} />
          <ErrorText>{error}</ErrorText>
          <Button onClick={run} disabled={working}>{working ? 'Memproses…' : `Ubah ke ${papers[paper].label}`}</Button>
          <p className="text-sm text-muted">Link dan kolom isian di dalam PDF tidak ikut terbawa ke file baru.</p>
        </div>
      )}
    </ToolShell>
  )
}
