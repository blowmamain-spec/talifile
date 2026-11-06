import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, ErrorText, FileBar, TextField } from '../components/ui'
import { deliver } from '../lib/handoff'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'

type Info = { title: string; author: string; subject: string; keywords: string; creator: string; producer: string }
const empty: Info = { title: '', author: '', subject: '', keywords: '', creator: '', producer: '' }
const labels: Record<keyof Info, string> = {
  title: 'Judul',
  author: 'Penulis',
  subject: 'Subjek',
  keywords: 'Kata kunci (pisahkan dengan koma)',
  creator: 'Dibuat dengan aplikasi',
  producer: 'Diproduksi oleh',
}

export default function InfoPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<Info>(empty)
  const [original, setOriginal] = useState<Info>(empty)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setError('')
    try {
      const pdf = await PDFDocument.load(await f.arrayBuffer(), { updateMetadata: false })
      const read: Info = {
        title: pdf.getTitle() ?? '',
        author: pdf.getAuthor() ?? '',
        subject: pdf.getSubject() ?? '',
        keywords: pdf.getKeywords() ?? '',
        creator: pdf.getCreator() ?? '',
        producer: pdf.getProducer() ?? '',
      }
      setFile(f)
      setInfo(read)
      setOriginal(read)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal membuka PDF.'))
    }
  }

  async function save() {
    if (!file) return
    setWorking(true)
    setError('')
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false })
      pdf.setTitle(info.title)
      pdf.setAuthor(info.author)
      pdf.setSubject(info.subject)
      pdf.setKeywords(info.keywords.split(',').map((k) => k.trim()).filter(Boolean))
      pdf.setCreator(info.creator)
      pdf.setProducer(info.producer)
      // updateMetadata: false keeps pdf-lib from stamping its own name over the producer field.
      deliver(toBlob(await pdf.save({ updateFieldAppearances: false }), 'application/pdf'), file.name)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menyimpan PDF.'))
    } finally {
      setWorking(false)
    }
  }

  const changed = (Object.keys(info) as (keyof Info)[]).some((k) => info[k] !== original[k])

  return (
    <ToolShell icon="info-pdf" title="Edit Info PDF" description="Ubah judul, penulis, dan info lain yang muncul di properti file, atau kosongkan semuanya sebelum dibagikan.">
      {!file && <Dropzone accept="application/pdf" onFiles={handleFiles} label="Pilih file PDF" />}
      <ErrorText>{!file && error}</ErrorText>
      {file && (
        <div className="space-y-5">
          <FileBar name={file.name} onChange={() => setFile(null)} />
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(labels) as (keyof Info)[]).map((k) => (
              <TextField key={k} label={labels[k]} value={info[k]} onChange={(e) => setInfo((i) => ({ ...i, [k]: e.target.value }))} placeholder="Kosong" className={k === 'title' || k === 'keywords' ? 'sm:col-span-2' : ''} />
            ))}
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex flex-wrap gap-3">
            <Button onClick={save} disabled={working || !changed}>{working ? 'Menyimpan…' : changed ? 'Simpan & download' : 'Belum ada perubahan'}</Button>
            <Button variant="secondary" onClick={() => setInfo(empty)}>Kosongkan semua</Button>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
