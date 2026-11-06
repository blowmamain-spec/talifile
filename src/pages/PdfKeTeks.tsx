import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, ErrorText, FileBar } from '../components/ui'
import { loadPdfDocument } from '../lib/pdfjs'
import { friendlyPdfError } from '../lib/pdfErrors'
import { deliver, setPendingFiles } from '../lib/handoff'

export default function PdfKeTeks() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'kosong'>('idle')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  async function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    setText('')
    setError('')
    setStatus('working')
    try {
      const doc = await loadPdfDocument(f)
      const pages: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        setProgress(`${i}/${doc.numPages}`)
        const tc = await (await doc.getPage(i)).getTextContent()
        let out = ''
        for (const item of tc.items) {
          if (!('str' in item)) continue
          out += item.str + (item.hasEOL ? '\n' : '')
        }
        pages.push(out.trim())
      }
      const joined = pages.map((t, i) => `--- Halaman ${i + 1} ---\n${t}`).join('\n\n')
      setText(joined)
      setStatus(pages.every((p) => !p) ? 'kosong' : 'done')
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal membaca PDF.'))
      setStatus('idle')
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Browser menolak akses clipboard. Pilih teksnya lalu salin manual.')
    }
  }

  return (
    <ToolShell icon="pdf-ke-teks" title="PDF ke Teks" description="Ambil semua teks dari PDF biasa dalam hitungan detik. Untuk PDF hasil scan, pakai OCR PDF.">
      {!file && <Dropzone accept="application/pdf" onFiles={handleFiles} label="Pilih file PDF" />}
      <ErrorText>{error}</ErrorText>
      {file && (
        <div>
          <FileBar name={file.name} onChange={() => { setFile(null); setStatus('idle') }} />
          {status === 'working' && <p className="mt-6 text-sm text-muted" role="status">Membaca halaman {progress}…</p>}
          {status === 'kosong' && (
            <div className="mt-6 rounded-xl bg-surface p-5 ring-1 ring-ink/10">
              <p className="font-medium">Tidak ada teks yang bisa diambil.</p>
              <p className="mt-1 text-sm text-muted">Sepertinya ini PDF hasil scan (isinya gambar). OCR bisa membaca teks dari gambar.</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setPendingFiles([file])
                  navigate('/ocr-pdf')
                }}
              >
                Buka di OCR PDF
              </Button>
            </div>
          )}
          {status === 'done' && (
            <div className="mt-6">
              <label htmlFor="hasil-teks" className="sr-only">Hasil teks</label>
              <textarea id="hasil-teks" readOnly value={text} rows={16} className="w-full resize-y rounded-xl bg-surface px-4 py-3 font-mono text-sm outline-none ring-1 ring-ink/15 focus-visible:ring-2 focus-visible:ring-brand-500" />
              <div className="mt-3 flex flex-wrap gap-3">
                <Button onClick={copy}>{copied ? 'Tersalin' : 'Salin semua'}</Button>
                <Button variant="secondary" onClick={() => deliver(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${file.name.replace(/\.pdf$/i, '')}.txt`)}>
                  Download .txt
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  )
}
