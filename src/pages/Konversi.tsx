import { useState } from 'react'
import JSZip from 'jszip'
import ToolShell, { EmbeddedContext } from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, Chips, ErrorText, Panel, Slider, baseName, canvasToBlob } from '../components/ui'
import { clearPendingFiles, deliver, setPendingFiles } from '../lib/handoff'
import { formatBytes } from '../lib/format'
import { docxToPdf, pdfToDocx, txtToDocx, txtToPdf } from '../lib/docConvert'
import { friendlyPdfError } from '../lib/pdfErrors'
import ImageToPdf from './ImageToPdf'
import PdfToImage from './PdfToImage'
import PdfKeTeks from './PdfKeTeks'

type Kind = 'gambar' | 'pdf' | 'word' | 'teks'
type Target = 'jpg' | 'png' | 'webp' | 'pdf' | 'docx' | 'txt' | 'gambar'

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ACCEPT = `image/*,.heic,.heif,application/pdf,${DOCX},.docx,text/plain,.txt,.md`

function kindOf(f: File): Kind | null {
  const n = f.name.toLowerCase()
  if (f.type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if (f.type === DOCX || n.endsWith('.docx')) return 'word'
  if (f.type.startsWith('text/') || n.endsWith('.txt') || n.endsWith('.md')) return 'teks'
  if (f.type.startsWith('image/') || /\.(heic|heif)$/.test(n)) return 'gambar'
  return null
}

const kindLabel: Record<Kind, string> = { gambar: 'gambar', pdf: 'PDF', word: 'dokumen Word', teks: 'file teks' }
const targets: Record<Kind, { value: Target; label: string }[]> = {
  gambar: [
    { value: 'jpg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
    { value: 'webp', label: 'WebP' },
    { value: 'pdf', label: 'PDF' },
  ],
  pdf: [
    { value: 'gambar', label: 'Gambar (JPG)' },
    { value: 'docx', label: 'Word (.docx)' },
    { value: 'txt', label: 'Teks (.txt)' },
  ],
  word: [{ value: 'pdf', label: 'PDF' }],
  teks: [
    { value: 'pdf', label: 'PDF' },
    { value: 'docx', label: 'Word (.docx)' },
  ],
}

/** HEIC from iPhones is decoded once up front, so every target (and the hosted tools) gets a normal PNG. */
async function normalize(files: File[]): Promise<File[]> {
  const out: File[] = []
  for (const f of files) {
    if (/image\/hei[cf]/.test(f.type) || /\.hei[cf]$/i.test(f.name)) {
      const { heicTo } = await import('heic-to/csp')
      const png = await heicTo({ blob: f, type: 'image/png' })
      out.push(new File([png], f.name.replace(/\.hei[cf]$/i, '.png'), { type: 'image/png' }))
    } else out.push(f)
  }
  return out
}

function ImageFormat({ files, target }: { files: File[]; target: 'jpg' | 'png' | 'webp' }) {
  const [quality, setQuality] = useState(0.9)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const mime = target === 'jpg' ? 'image/jpeg' : `image/${target}`

  async function run() {
    setWorking(true)
    setError('')
    try {
      const outs: { name: string; blob: Blob }[] = []
      for (const f of files) {
        const bmp = await createImageBitmap(f)
        const c = document.createElement('canvas')
        c.width = bmp.width
        c.height = bmp.height
        const ctx = c.getContext('2d')!
        // JPG has no transparency: put transparent PNGs on white instead of black.
        if (target === 'jpg') {
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, c.width, c.height)
        }
        ctx.drawImage(bmp, 0, 0)
        outs.push({ name: `${baseName(f.name)}.${target}`, blob: await canvasToBlob(c, mime, quality) })
      }
      if (outs.length === 1) deliver(outs[0].blob, outs[0].name)
      else {
        const zip = new JSZip()
        outs.forEach((o) => zip.file(o.name, o.blob))
        deliver(await zip.generateAsync({ type: 'blob' }), `gambar-${target}.zip`)
      }
    } catch (err) {
      console.error(err)
      setError('Ada gambar yang gagal dikonversi. Pastikan file-nya tidak rusak.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-5">
      {target !== 'png' && <Slider label="Kualitas" value={quality} display={`${Math.round(quality * 100)}%`} min={0.5} max={1} step={0.05} onChange={setQuality} />}
      <ErrorText>{error}</ErrorText>
      <Button onClick={run} disabled={working}>
        {working ? 'Mengonversi…' : files.length > 1 ? `Konversi ${files.length} gambar (.zip)` : `Konversi ke ${target.toUpperCase()}`}
      </Button>
    </div>
  )
}

function DocJob({ files, kind, target }: { files: File[]; kind: Kind; target: Target }) {
  const [mode, setMode] = useState<'teks' | 'persis'>('teks')
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const file = files[0]

  async function run() {
    setWorking(true)
    setError('')
    setNote('')
    try {
      if (kind === 'pdf' && target === 'docx') {
        const { blob, empty } = await pdfToDocx(file, mode, setProgress)
        if (empty) {
          setError('PDF ini tidak berisi teks (sepertinya hasil scan). Pilih mode "Tampilan persis", atau pakai OCR PDF dulu.')
          return
        }
        deliver(blob, `${baseName(file.name)}.docx`)
      } else if (kind === 'word') {
        deliver(await docxToPdf(file, setProgress), `${baseName(file.name)}.pdf`)
        setNote('Selesai. Teks di PDF ini berupa gambar, jadi tidak bisa diseleksi.')
      } else if (kind === 'teks') {
        const text = await file.text()
        deliver(target === 'pdf' ? await txtToPdf(text) : await txtToDocx(text), `${baseName(file.name)}.${target}`)
      }
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, kind === 'word' ? 'Dokumen Word ini gagal dikonversi. Pastikan formatnya .docx (bukan .doc lama).' : 'Gagal mengonversi file.'))
    } finally {
      setWorking(false)
      setProgress('')
    }
  }

  return (
    <div className="space-y-5">
      {kind === 'pdf' && target === 'docx' && (
        <Chips
          name="mode"
          legend="Hasil Word"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'teks', label: 'Teks bisa diedit' },
            { value: 'persis', label: 'Tampilan persis (gambar)' },
          ]}
        />
      )}
      <Panel className="text-sm text-muted">
        {kind === 'pdf' && target === 'docx'
          ? mode === 'teks'
            ? 'Paragraf dan ukuran huruf disusun ulang supaya bisa diedit. Tabel, kolom, dan gambar tidak ikut, tata letak tidak persis sama.'
            : 'Tiap halaman dimasukkan sebagai gambar: terlihat sama persis, tapi teksnya tidak bisa diedit.'
          : kind === 'word'
            ? 'Tampilan dibuat semirip mungkin dengan Word. Font yang tidak ada di perangkat ini diganti font serupa, dan teks di PDF berupa gambar.'
            : 'Setiap baris jadi satu baris di dokumen baru.'}
      </Panel>
      <ErrorText>{error}</ErrorText>
      {note && (
        <p className="text-sm text-brand-700" role="status">
          {note}
        </p>
      )}
      <Button onClick={run} disabled={working}>
        {working ? progress || 'Mengonversi…' : `Konversi ke ${target === 'docx' ? 'Word' : target.toUpperCase()}`}
      </Button>
    </div>
  )
}

export default function Konversi() {
  const [files, setFiles] = useState<File[]>([])
  const [kind, setKind] = useState<Kind | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  const [error, setError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [mountKey, setMountKey] = useState(0)

  async function handleFiles(list: File[]) {
    setError('')
    const first = list.map(kindOf).find(Boolean) ?? null
    if (!first) {
      setError('Format file ini belum didukung. Coba gambar, PDF, Word (.docx), atau teks (.txt).')
      return
    }
    const same = list.filter((f) => kindOf(f) === first)
    if (same.length < list.length) setError(`Hanya ${kindLabel[first]} yang diproses. File dengan jenis lain dilewati.`)
    // Word and text conversions take one file at a time.
    const picked = first === 'gambar' || first === 'pdf' ? same : same.slice(0, 1)
    setPreparing(true)
    try {
      setFiles(await normalize(first === 'pdf' ? picked.slice(0, 1) : picked))
      setKind(first)
      setTarget(null)
    } catch (err) {
      console.error(err)
      setError('Foto HEIC ini tidak bisa dibaca. Coba ekspor ulang dari Galeri sebagai JPG.')
    } finally {
      setPreparing(false)
    }
  }

  function choose(t: Target) {
    // Hosted tools pick their files up from the hand-off queue when they mount. Only queue for those:
    // an unclaimed queue would be swallowed by the next upload box and bring the old file back.
    const isHosted = (kind === 'gambar' && t === 'pdf') || (kind === 'pdf' && (t === 'gambar' || t === 'txt'))
    if (isHosted) setPendingFiles(files)
    else clearPendingFiles()
    setTarget(t)
    setMountKey((k) => k + 1)
  }

  function reset() {
    clearPendingFiles()
    setFiles([])
    setKind(null)
    setTarget(null)
  }

  const hosted =
    kind === 'gambar' && target === 'pdf' ? <ImageToPdf key={mountKey} /> : kind === 'pdf' && target === 'gambar' ? <PdfToImage key={mountKey} /> : kind === 'pdf' && target === 'txt' ? <PdfKeTeks key={mountKey} /> : null

  return (
    <ToolShell icon="konversi" title="Konversi File" description="Masukkan file apa saja: gambar, PDF, Word, atau teks. TaliFile mengenali jenisnya, kamu tinggal pilih mau dijadikan apa.">
      {!kind && (
        <>
          <Dropzone accept={ACCEPT} multiple onFiles={handleFiles} label="Pilih file yang mau dikonversi" hint="Gambar (termasuk HEIC iPhone), PDF, Word .docx, atau .txt" />
          {preparing && (
            <p className="mt-4 text-sm text-muted" role="status">
              Membaca file…
            </p>
          )}
        </>
      )}
      <ErrorText>{error}</ErrorText>

      {kind && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-ink/10">
            <div className="min-w-0">
              <p className="truncate font-medium">{files.length === 1 ? files[0].name : `${files.length} ${kindLabel[kind]}`}</p>
              <p className="text-sm text-muted">
                Terdeteksi: {kindLabel[kind]} · {formatBytes(files.reduce((n, f) => n + f.size, 0))}
              </p>
            </div>
            <Button variant="secondary" onClick={reset} className="!min-h-10 !px-4">
              Ganti file
            </Button>
          </div>

          <Chips name="target" legend="Jadikan" value={target ?? ('' as Target)} onChange={choose} options={targets[kind]} />

          {target && (kind !== 'gambar' || target === 'pdf') && hosted && <EmbeddedContext.Provider value={true}>{hosted}</EmbeddedContext.Provider>}
          {kind === 'gambar' && target && target !== 'pdf' && <ImageFormat files={files} target={target as 'jpg' | 'png' | 'webp'} />}
          {target && !hosted && kind !== 'gambar' && <DocJob key={`${kind}-${target}`} files={files} kind={kind} target={target} />}
        </div>
      )}
    </ToolShell>
  )
}
