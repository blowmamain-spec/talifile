import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { formatBytes, toBlob } from '../lib/format'
import { loadPdfDocument, renderPageToCanvas } from '../lib/pdfjs'

type Kind = 'image' | 'pdf'
type Result = { url: string; size: number; name: string }

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality))
}

export default function Compress() {
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<Kind>('image')
  const [quality, setQuality] = useState(0.7)
  const [maxDim, setMaxDim] = useState(1920)
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    setKind(f.type === 'application/pdf' ? 'pdf' : 'image')
    setResult(null)
    setError('')
  }

  async function compressImage(f: File) {
    const { default: imageCompression } = await import('browser-image-compression')
    const compressed = await imageCompression(f, {
      maxWidthOrHeight: maxDim,
      initialQuality: quality,
      useWebWorker: true,
      maxSizeMB: 50,
      onProgress: (p: number) => setProgress(`Mengompres… ${p}%`),
    })
    return compressed
  }

  async function compressPdf(f: File) {
    const pdfDoc = await loadPdfDocument(f)
    const out = await PDFDocument.create()

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      setProgress(`Memproses halaman ${i}/${pdfDoc.numPages}…`)
      const page = await pdfDoc.getPage(i)
      const canvas = await renderPageToCanvas(page, 1.5)
      const blob = await canvasToBlob(canvas, quality)
      const bytes = await blob.arrayBuffer()
      const img = await out.embedJpg(bytes)

      const viewport = page.getViewport({ scale: 1 })
      const outPage = out.addPage([viewport.width, viewport.height])
      outPage.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height })
    }

    const bytes = await out.save()
    return toBlob(bytes, 'application/pdf')
  }

  async function run() {
    if (!file) return
    setWorking(true)
    setError('')
    setResult(null)
    try {
      const blob = kind === 'image' ? await compressImage(file) : await compressPdf(file)
      setResult({
        url: URL.createObjectURL(blob),
        size: blob.size,
        name:
          kind === 'image'
            ? `compressed-${file.name}`
            : `${file.name.replace(/\.pdf$/i, '')}-compressed.pdf`,
      })
    } catch (err) {
      console.error(err)
      setError('Gagal mengompres file. Coba file lain.')
    } finally {
      setWorking(false)
      setProgress('')
    }
  }

  return (
    <ToolShell title="Compress File" description="Perkecil ukuran gambar atau PDF langsung di browser.">
      {!file && (
        <Dropzone
          accept="image/*,application/pdf"
          onFiles={handleFiles}
          label="Klik atau drop gambar / PDF di sini"
          hint="JPG, PNG, WebP, atau PDF"
        />
      )}

      {file && (
        <div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-ink/[0.03] px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm tabular-nums text-ink/50">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setResult(null)
              }}
              className="shrink-0 rounded-full px-4 py-1.5 text-sm text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Ganti file
            </button>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="flex items-center justify-between text-sm">
                <span>Kualitas</span>
                <span className="tabular-nums text-ink/50">{Math.round(quality * 100)}%</span>
              </label>
              <input
                type="range"
                min={0.2}
                max={0.95}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-2 w-full accent-brand-500"
              />
              {kind === 'pdf' && (
                <p className="mt-2 text-sm text-ink/50">
                  PDF akan diubah jadi gambar per halaman, teks tidak lagi bisa diseleksi/dicopy.
                  Cocok untuk PDF hasil scan.
                </p>
              )}
            </div>

            {kind === 'image' && (
              <div>
                <label className="flex items-center justify-between text-sm">
                  <span>Dimensi maksimum</span>
                  <span className="tabular-nums text-ink/50">{maxDim}px</span>
                </label>
                <input
                  type="range"
                  min={480}
                  max={4000}
                  step={40}
                  value={maxDim}
                  onChange={(e) => setMaxDim(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-500"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={run}
            disabled={working}
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? progress || 'Mengompres…' : 'Compress'}
          </button>

          {result && (
            <div className="mt-6 rounded-xl bg-ink/[0.03] p-4" aria-live="polite">
              <p className="text-sm">
                Ukuran baru:{' '}
                <span className="font-semibold tabular-nums">{formatBytes(result.size)}</span>{' '}
                <span className="tabular-nums text-ink/50">
                  (sebelumnya {formatBytes(file.size)},{' '}
                  {Math.max(0, Math.round((1 - result.size / file.size) * 100))}% lebih kecil)
                </span>
              </p>
              <a
                href={result.url}
                download={result.name}
                className="mt-3 inline-block rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Download
              </a>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  )
}
