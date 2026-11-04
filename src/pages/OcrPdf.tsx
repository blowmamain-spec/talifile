import { useRef, useState } from 'react'
import type { Worker as TesseractWorker } from 'tesseract.js'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'
import { friendlyPdfError } from '../lib/pdfErrors'

type Lang = 'ind+eng' | 'eng' | 'ind'

const langOptions: { value: Lang; label: string }[] = [
  { value: 'ind+eng', label: 'Indonesia + Inggris' },
  { value: 'ind', label: 'Indonesia' },
  { value: 'eng', label: 'Inggris' },
]

export default function OcrPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState<Lang>('ind+eng')
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState('')
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const cancelledRef = useRef(false)
  const workerRef = useRef<TesseractWorker | null>(null)

  function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    setText('')
    setError('')
    setCopied(false)
  }

  async function run() {
    if (!file) return
    setWorking(true)
    setError('')
    setText('')
    cancelledRef.current = false
    let worker: TesseractWorker | null = null
    try {
      setProgress('Menyiapkan OCR…')
      const Tesseract = await import('tesseract.js')
      const pdfDoc = await loadPdfDocument(file)
      const total = pdfDoc.numPages
      let current = 1
      worker = await Tesseract.createWorker(lang.split('+'), undefined, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(`Membaca halaman ${current}/${total}… ${Math.round(m.progress * 100)}%`)
          }
        },
      })
      workerRef.current = worker

      const pageTexts: string[] = []
      for (let i = 1; i <= total; i++) {
        if (cancelledRef.current) break
        current = i
        setProgress(`Menyiapkan halaman ${i}/${total}…`)
        const page = await pdfDoc.getPage(i)
        const canvas = await renderPageToCanvas(page, 2)
        const { data } = await worker.recognize(canvas)
        pageTexts.push(data.text.trim())
        setText(pageTexts.map((t, idx) => `--- Halaman ${idx + 1} ---\n${t}`).join('\n\n'))
      }
    } catch (err) {
      if (!cancelledRef.current) {
        console.error(err)
        setError(friendlyPdfError(err, 'Gagal membaca teks dari PDF.'))
      }
    } finally {
      await worker?.terminate().catch(() => {})
      workerRef.current = null
      setWorking(false)
      setProgress('')
    }
  }

  function cancel() {
    cancelledRef.current = true
    // Terminating mid-recognize rejects the pending promise, which run() treats as a cancel.
    workerRef.current?.terminate().catch(() => {})
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard access denied, ignore
    }
  }

  function downloadText() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file?.name.replace(/\.pdf$/i, '') ?? 'ocr'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolShell
      icon="ocr-pdf"
      title="OCR PDF"
      description="Ekstrak teks dari PDF hasil scan, bisa disalin atau didownload sebagai .txt."
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
              onClick={() => {
                setFile(null)
                setText('')
              }}
              className="shrink-0 rounded-full bg-ink/5 px-4 py-1.5 text-sm text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Ganti file
            </button>
          </div>

          <fieldset className="mt-5 flex flex-wrap gap-2">
            <legend className="mb-2 text-sm font-medium">Bahasa</legend>
            {langOptions.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  lang === opt.value
                    ? 'bg-brand-500/10 text-brand-700 ring-1 ring-brand-500'
                    : 'bg-ink/5 text-ink/65 hover:bg-ink/10'
                }`}
              >
                <input
                  type="radio"
                  name="lang"
                  checked={lang === opt.value}
                  onChange={() => setLang(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </fieldset>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={working}
              className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {working ? progress || 'Memproses…' : 'Mulai OCR'}
            </button>
            {working && (
              <button
                type="button"
                onClick={cancel}
                className="rounded-full bg-ink/5 px-5 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Batal
              </button>
            )}
          </div>
          {!working && !text && (
            <p className="mt-3 text-xs text-ink/50">
              Pertama kali dipakai, data bahasa (beberapa MB) diunduh dulu. Setelah itu lebih cepat.
            </p>
          )}

          {text && (
            <div className="mt-6">
              <textarea
                readOnly
                value={text}
                rows={14}
                className="w-full resize-y rounded-lg bg-ink/[0.04] px-3 py-2 font-mono text-sm outline-none ring-1 ring-transparent focus-visible:ring-brand-500"
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copyText}
                  className="rounded-full bg-ink/5 px-5 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  {copied ? 'Tersalin!' : 'Salin teks'}
                </button>
                <button
                  type="button"
                  onClick={downloadText}
                  className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  Download .txt
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  )
}
