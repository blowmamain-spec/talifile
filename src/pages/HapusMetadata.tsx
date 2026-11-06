import { useState } from 'react'
import JSZip from 'jszip'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, ErrorText, canvasToBlob } from '../components/ui'
import { deliver } from '../lib/handoff'
import { formatBytes, toBlob } from '../lib/format'
import { stripJpeg, stripPng } from '../lib/stripMetadata'

type Found = { gps?: string; camera?: string; date?: string; software?: string }
type Item = { id: string; file: File; found: Found | null; status: 'cek' | 'siap' | 'bersih' | 'gagal'; out?: Blob; note?: string }

async function inspect(file: File): Promise<Found> {
  const exifr = (await import('exifr')).default
  const data = await exifr.parse(file, { gps: true, tiff: true, exif: true, xmp: true }).catch(() => null)
  if (!data) return {}
  const found: Found = {}
  if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
    found.gps = `${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`
  }
  const camera = [data.Make, data.Model].filter(Boolean).join(' ')
  if (camera) found.camera = camera
  const date = data.DateTimeOriginal ?? data.CreateDate
  if (date instanceof Date) found.date = date.toLocaleString('id-ID')
  if (data.Software) found.software = String(data.Software)
  return found
}

async function clean(file: File): Promise<{ blob: Blob; note: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (file.type === 'image/jpeg') {
    const exifr = (await import('exifr')).default
    const orientation = await exifr.orientation(file).catch(() => 1)
    // Rotation lives in EXIF: removing it would turn the photo sideways, so those get re-encoded upright instead.
    if (!orientation || orientation === 1) return { blob: toBlob(stripJpeg(bytes), 'image/jpeg'), note: 'Tanpa mengurangi kualitas' }
  } else if (file.type === 'image/png') {
    return { blob: toBlob(stripPng(bytes), 'image/png'), note: 'Tanpa mengurangi kualitas' }
  }
  const img = await createImageBitmap(file)
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  c.getContext('2d')!.drawImage(img, 0, 0)
  return { blob: await canvasToBlob(c, file.type === 'image/webp' ? 'image/webp' : 'image/jpeg', 0.95), note: 'Disimpan ulang, kualitas 95%' }
}

export default function HapusMetadata() {
  const [items, setItems] = useState<Item[]>([])
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: File[]) {
    const next: Item[] = files.map((file) => ({ id: `${file.name}-${Math.random()}`, file, found: null, status: 'cek' }))
    setItems((prev) => [...prev, ...next])
    for (const it of next) {
      const found = await inspect(it.file)
      setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, found, status: 'siap' } : p)))
    }
  }

  async function run() {
    setWorking(true)
    setError('')
    const done: { name: string; blob: Blob }[] = []
    for (const it of items) {
      try {
        const { blob, note } = await clean(it.file)
        done.push({ name: it.file.name, blob })
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: 'bersih', out: blob, note } : p)))
      } catch (err) {
        console.error(err)
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: 'gagal', note: 'Format file tidak dikenali' } : p)))
      }
    }
    if (done.length === 1) deliver(done[0].blob, done[0].name)
    else if (done.length > 1) {
      const zip = new JSZip()
      done.forEach((d) => zip.file(d.name, d.blob))
      deliver(await zip.generateAsync({ type: 'blob' }), 'foto-tanpa-metadata.zip')
    } else setError('Tidak ada file yang berhasil dibersihkan.')
    setWorking(false)
  }

  const label = (f: Found | null) => {
    if (!f) return 'Memeriksa…'
    const parts = [f.gps && `Lokasi GPS ${f.gps}`, f.camera && `Kamera ${f.camera}`, f.date && `Diambil ${f.date}`, f.software && `Software ${f.software}`].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'Tidak ada metadata yang terbaca'
  }

  return (
    <ToolShell
      icon="hapus-metadata"
      title="Hapus Metadata"
      description="Foto dari HP sering menyimpan lokasi GPS, model kamera, dan waktu pengambilan. Hapus sebelum dibagikan ke orang yang tidak kamu kenal."
    >
      <Dropzone accept="image/jpeg,image/png,image/webp" multiple compact={items.length > 0} onFiles={handleFiles} label={items.length ? 'Tambah foto lagi' : 'Pilih foto'} hint="JPG, PNG, atau WebP, bisa banyak sekaligus" />
      {items.length > 0 && (
        <div className="mt-6">
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="rounded-xl bg-surface p-3.5 ring-1 ring-ink/10">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate font-medium">{it.file.name}</p>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    {formatBytes(it.file.size)}
                    {it.out && ` → ${formatBytes(it.out.size)}`}
                  </span>
                </div>
                <p className={`mt-1 text-sm ${it.found?.gps && it.status !== 'bersih' ? 'font-medium text-danger' : 'text-muted'}`}>
                  {it.status === 'bersih' ? `Bersih. ${it.note}.` : it.status === 'gagal' ? it.note : label(it.found)}
                </p>
              </li>
            ))}
          </ul>
          <ErrorText>{error}</ErrorText>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={run} disabled={working || items.some((i) => i.status === 'cek')}>
              {working ? 'Membersihkan…' : `Hapus metadata (${items.length} foto)`}
            </Button>
            <Button variant="secondary" onClick={() => setItems([])}>
              Mulai ulang
            </Button>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
