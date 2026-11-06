import { useState } from 'react'
import JSZip from 'jszip'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, Chips, ErrorText, Slider, baseName, canvasToBlob } from '../components/ui'
import { deliver } from '../lib/handoff'
import { formatBytes } from '../lib/format'

type Mode = 'sisi' | 'persen'
type Out = 'asli' | 'image/jpeg' | 'image/png' | 'image/webp'

/** Halves the image step by step before the final draw: one big jump down makes jagged edges. */
function resize(img: ImageBitmap, w: number, h: number) {
  let src: CanvasImageSource = img
  let sw = img.width
  let sh = img.height
  while (sw / 2 > w && sh / 2 > h) {
    const step = document.createElement('canvas')
    step.width = Math.round(sw / 2)
    step.height = Math.round(sh / 2)
    const s = step.getContext('2d')!
    s.imageSmoothingQuality = 'high'
    s.drawImage(src, 0, 0, step.width, step.height)
    src = step
    sw = step.width
    sh = step.height
  }
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, w, h)
  return c
}

export default function ResizeBanyak() {
  const [files, setFiles] = useState<File[]>([])
  const [mode, setMode] = useState<Mode>('sisi')
  const [side, setSide] = useState(1280)
  const [percent, setPercent] = useState(50)
  const [out, setOut] = useState<Out>('asli')
  const [quality, setQuality] = useState(0.85)
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  async function run() {
    setWorking(true)
    setError('')
    setResult('')
    try {
      const zip = new JSZip()
      let before = 0
      let after = 0
      for (const [i, f] of files.entries()) {
        setProgress(`${i + 1}/${files.length}`)
        const img = await createImageBitmap(f)
        const ratio = mode === 'persen' ? percent / 100 : Math.min(1, side / Math.max(img.width, img.height))
        const c = resize(img, Math.max(1, Math.round(img.width * ratio)), Math.max(1, Math.round(img.height * ratio)))
        const type = out === 'asli' ? (['image/png', 'image/webp'].includes(f.type) ? f.type : 'image/jpeg') : out
        const blob = await canvasToBlob(c, type, quality)
        const ext = type.split('/')[1].replace('jpeg', 'jpg')
        zip.file(`${baseName(f.name)}-${c.width}x${c.height}.${ext}`, blob)
        before += f.size
        after += blob.size
        if (files.length === 1) {
          deliver(blob, `${baseName(f.name)}-${c.width}x${c.height}.${ext}`)
        }
      }
      if (files.length > 1) deliver(await zip.generateAsync({ type: 'blob' }), 'gambar-resize.zip')
      setResult(`${files.length} gambar selesai: ${formatBytes(before)} jadi ${formatBytes(after)}.`)
    } catch (err) {
      console.error(err)
      setError('Ada gambar yang gagal diproses. Pastikan semuanya JPG, PNG, atau WebP.')
    } finally {
      setWorking(false)
      setProgress('')
    }
  }

  return (
    <ToolShell icon="resize-banyak" title="Resize Banyak Gambar" description="Ubah ukuran banyak gambar dengan aturan yang sama, hasilnya satu file .zip.">
      <Dropzone accept="image/png,image/jpeg,image/webp" multiple compact={files.length > 0} onFiles={(f) => setFiles((p) => [...p, ...f])} label={files.length ? 'Tambah gambar lagi' : 'Pilih gambar'} hint="Bisa puluhan sekaligus" />
      {files.length > 0 && (
        <div className="mt-6 space-y-5">
          <p className="text-sm text-muted">
            {files.length} gambar dipilih, total {formatBytes(files.reduce((n, f) => n + f.size, 0))}.{' '}
            <button type="button" onClick={() => setFiles([])} className="font-medium text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-500">
              Kosongkan
            </button>
          </p>
          <Chips name="mode" legend="Cara mengubah ukuran" value={mode} onChange={setMode} options={[{ value: 'sisi', label: 'Sisi terpanjang' }, { value: 'persen', label: 'Persentase' }]} />
          {mode === 'sisi' ? (
            <Slider label="Sisi terpanjang maksimal" value={side} display={`${side}px`} min={320} max={4000} step={40} onChange={setSide} />
          ) : (
            <Slider label="Ukuran baru" value={percent} display={`${percent}%`} min={10} max={100} step={5} onChange={setPercent} />
          )}
          <Chips
            name="out"
            legend="Format hasil"
            value={out}
            onChange={setOut}
            options={[
              { value: 'asli', label: 'Sama seperti asli' },
              { value: 'image/jpeg', label: 'JPG' },
              { value: 'image/png', label: 'PNG' },
              { value: 'image/webp', label: 'WebP' },
            ]}
          />
          {out !== 'image/png' && <Slider label="Kualitas" value={quality} display={`${Math.round(quality * 100)}%`} min={0.5} max={1} step={0.05} onChange={setQuality} />}
          <ErrorText>{error}</ErrorText>
          {result && (
            <p className="text-sm text-brand-700" role="status">
              {result}
            </p>
          )}
          <Button onClick={run} disabled={working}>
            {working ? `Memproses ${progress}…` : files.length === 1 ? 'Resize & download' : `Resize ${files.length} gambar (.zip)`}
          </Button>
        </div>
      )}
    </ToolShell>
  )
}
