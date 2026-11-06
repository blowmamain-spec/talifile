import { useEffect, useRef, useState } from 'react'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, Chips, ErrorText, FileBar, Slider, TextField, baseName, canvasToBlob } from '../components/ui'
import { deliver } from '../lib/handoff'

type Layout = 'ulang' | 'tengah'
type Color = 'gelap' | 'terang'

function render(
  canvas: HTMLCanvasElement,
  img: ImageBitmap,
  o: { text: string; layout: Layout; color: Color; opacity: number; size: number },
) {
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const text = o.text.trim()
  if (!text) return
  // Size is a share of the shorter side so the look is the same on a small screenshot and a 12 MP photo.
  const fontPx = Math.max(10, (Math.min(img.width, img.height) * o.size) / 100)
  ctx.font = `600 ${fontPx}px Helvetica, Arial, sans-serif`
  ctx.fillStyle = o.color === 'gelap' ? `rgba(20,20,20,${o.opacity})` : `rgba(255,255,255,${o.opacity})`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(img.width / 2, img.height / 2)
  ctx.rotate((-30 * Math.PI) / 180)
  if (o.layout === 'tengah') {
    ctx.fillText(text, 0, 0, img.width * 0.95)
  } else {
    // Repeat across the whole rotated area so cropping cannot remove it.
    const tw = ctx.measureText(text).width + fontPx * 2
    const th = fontPx * 3
    const span = Math.hypot(img.width, img.height)
    for (let y = -span / 2; y <= span / 2; y += th) {
      const shift = (Math.round(y / th) % 2) * (tw / 2)
      for (let x = -span / 2 - tw; x <= span / 2 + tw; x += tw) ctx.fillText(text, x + shift, y)
    }
  }
  ctx.restore()
}

export default function WatermarkGambar() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<ImageBitmap | null>(null)
  const [text, setText] = useState('Hanya untuk verifikasi')
  const [layout, setLayout] = useState<Layout>('ulang')
  const [color, setColor] = useState<Color>('gelap')
  const [opacity, setOpacity] = useState(0.35)
  const [size, setSize] = useState(6)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    try {
      setImg(await createImageBitmap(f))
      setFile(f)
      setError('')
    } catch {
      setError('File ini tidak bisa dibaca sebagai gambar.')
    }
  }

  useEffect(() => {
    if (canvasRef.current && img) render(canvasRef.current, img, { text, layout, color, opacity, size })
  }, [img, text, layout, color, opacity, size])

  async function download() {
    if (!canvasRef.current || !file) return
    const png = file.type === 'image/png'
    deliver(await canvasToBlob(canvasRef.current, png ? 'image/png' : 'image/jpeg', 0.92), `${baseName(file.name)}-watermark.${png ? 'png' : 'jpg'}`)
  }

  return (
    <ToolShell
      icon="watermark-gambar"
      title="Watermark Gambar"
      description='Tambahkan tulisan seperti "Hanya untuk verifikasi pinjaman X" di foto KTP atau dokumen sebelum dikirim.'
    >
      {!file && <Dropzone accept="image/png,image/jpeg,image/webp" onFiles={handleFiles} label="Pilih gambar" />}
      <ErrorText>{error}</ErrorText>

      {file && img && (
        <div>
          <FileBar name={file.name} onChange={() => setFile(null)} />
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_18rem]">
            <canvas ref={canvasRef} aria-label="Pratinjau watermark" className="block h-auto w-full rounded-xl ring-1 ring-ink/15" />
            <div className="space-y-5">
              <TextField label="Teks watermark" value={text} maxLength={80} onChange={(e) => setText(e.target.value)} placeholder="mis. Hanya untuk daftar CPNS 2026" />
              <p className="-mt-3 text-xs text-muted">Tulis tujuan dan tanggalnya, supaya salinan ini tidak bisa dipakai untuk hal lain.</p>
              <Chips name="layout" legend="Susunan" value={layout} onChange={setLayout} options={[{ value: 'ulang', label: 'Berulang' }, { value: 'tengah', label: 'Satu di tengah' }]} />
              <Chips name="color" legend="Warna teks" value={color} onChange={setColor} options={[{ value: 'gelap', label: 'Gelap' }, { value: 'terang', label: 'Terang' }]} />
              <Slider label="Ukuran teks" value={size} display={`${size}`} min={2} max={16} step={0.5} onChange={setSize} />
              <Slider label="Transparansi" value={opacity} display={`${Math.round(opacity * 100)}%`} min={0.1} max={0.9} step={0.05} onChange={setOpacity} />
              <Button onClick={download} disabled={!text.trim()} className="w-full">
                Download gambar
              </Button>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
