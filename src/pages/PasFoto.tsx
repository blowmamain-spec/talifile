import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, Chips, ErrorText, FileBar, Panel, Slider, baseName, canvasToBlob } from '../components/ui'
import { deliver } from '../lib/handoff'

type Size = '2x3' | '3x4' | '4x6'
type Bg = 'merah' | 'biru' | 'putih'

const DPI = 300
const cmToPx = (cm: number) => Math.round((cm / 2.54) * DPI)
const sizes: Record<Size, { w: number; h: number }> = {
  '2x3': { w: cmToPx(2), h: cmToPx(3) },
  '3x4': { w: cmToPx(3), h: cmToPx(4) },
  '4x6': { w: cmToPx(4), h: cmToPx(6) },
}
// Common print-shop shades for Indonesian ID photos.
const bgColors: Record<Bg, string> = { merah: '#c8102e', biru: '#1f5fae', putih: '#ffffff' }

export default function PasFoto() {
  const [file, setFile] = useState<File | null>(null)
  const [cutout, setCutout] = useState<ImageBitmap | null>(null)
  const [status, setStatus] = useState<'idle' | 'working' | 'ready' | 'error'>('idle')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [removeBg, setRemoveBg] = useState(true)
  const [size, setSize] = useState<Size>('3x4')
  const [bg, setBg] = useState<Bg>('merah')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  async function prepare(f: File, strip: boolean) {
    setStatus('working')
    setError('')
    setCutout(null)
    try {
      if (strip) {
        setProgress('Menyiapkan penghapus latar…')
        const { removeBackground } = await import('@imgly/background-removal')
        const blob = await removeBackground(f, {
          device: 'gpu',
          proxyToWorker: true,
          model: 'isnet_fp16',
          progress: (key, cur, total) =>
            setProgress(
              key.startsWith('fetch')
                ? `Mengunduh model… ${Math.round((cur / total) * 100)}%`
                : `Menghapus latar… ${Math.round((cur / total) * 100)}%`,
            ),
        })
        setCutout(await createImageBitmap(blob))
      } else {
        setCutout(await createImageBitmap(f))
      }
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setStatus('ready')
    } catch (err) {
      console.error(err)
      setError('Gagal memproses foto. Coba foto lain, atau matikan "Hapus latar asli".')
      setStatus('error')
    }
  }

  function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    prepare(f, removeBg)
  }

  // Draws the photo cover-fitted into the frame, then applies the user's zoom and drag offset.
  function draw(canvas: HTMLCanvasElement, s: Size) {
    if (!cutout) return
    const { w, h } = sizes[s]
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = bgColors[bg]
    ctx.fillRect(0, 0, w, h)
    const scale = Math.max(w / cutout.width, h / cutout.height) * zoom
    const dw = cutout.width * scale
    const dh = cutout.height * scale
    ctx.drawImage(cutout, (w - dw) / 2 + offset.x * w, (h - dh) / 2 + offset.y * h, dw, dh)
  }

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, size)
  })

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const d = dragRef.current
    if (!d) return
    const rect = e.currentTarget.getBoundingClientRect()
    setOffset({ x: d.ox + (e.clientX - d.x) / rect.width, y: d.oy + (e.clientY - d.y) / rect.height })
  }

  async function downloadSingle() {
    const c = document.createElement('canvas')
    draw(c, size)
    deliver(await canvasToBlob(c, 'image/jpeg', 0.95), `${baseName(file!.name)}-pasfoto-${size}.jpg`)
  }

  // A 4R sheet (10x15 cm) filled with as many copies as fit, with a thin gap to cut along.
  async function downloadSheet() {
    const sheet = document.createElement('canvas')
    sheet.width = cmToPx(10)
    sheet.height = cmToPx(15)
    const ctx = sheet.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, sheet.width, sheet.height)
    const one = document.createElement('canvas')
    draw(one, size)
    const gap = cmToPx(0.3)
    const cols = Math.floor((sheet.width - gap) / (one.width + gap))
    const rows = Math.floor((sheet.height - gap) / (one.height + gap))
    const startX = (sheet.width - (cols * one.width + (cols - 1) * gap)) / 2
    const startY = (sheet.height - (rows * one.height + (rows - 1) * gap)) / 2
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) ctx.drawImage(one, startX + c * (one.width + gap), startY + r * (one.height + gap))
    deliver(await canvasToBlob(sheet, 'image/jpeg', 0.95), `${baseName(file!.name)}-pasfoto-${size}-lembar-4R.jpg`)
  }

  const perSheet = (() => {
    const { w, h } = sizes[size]
    const gap = cmToPx(0.3)
    return Math.floor((cmToPx(10) - gap) / (w + gap)) * Math.floor((cmToPx(15) - gap) / (h + gap))
  })()

  return (
    <ToolShell
      icon="pas-foto"
      title="Pas Foto"
      description="Ubah foto biasa jadi pas foto 2x3, 3x4, atau 4x6 dengan latar merah, biru, atau putih. Siap cetak 300 DPI."
    >
      {!file && (
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Hapus latar asli otomatis (matikan kalau latarnya sudah polos)
          </label>
          <Dropzone accept="image/png,image/jpeg,image/webp" onFiles={handleFiles} label="Pilih foto wajah" hint="Foto setengah badan, menghadap depan, cahaya rata" />
        </div>
      )}

      {file && (
        <div>
          <FileBar
            name={file.name}
            onChange={() => {
              setFile(null)
              setCutout(null)
              setStatus('idle')
            }}
          />

          {status === 'working' && (
            <p className="mt-6 text-sm text-muted" role="status">
              {progress} Pertama kali dipakai, model AI diunduh dulu (sekali saja).
            </p>
          )}
          <ErrorText>{error}</ErrorText>

          {status === 'ready' && (
            <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,15rem)_1fr]">
              <div>
                <canvas
                  ref={canvasRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => (dragRef.current = null)}
                  onPointerCancel={() => (dragRef.current = null)}
                  aria-label="Pratinjau pas foto, seret untuk menggeser posisi"
                  className="mx-auto block w-full max-w-60 cursor-grab touch-none rounded-md shadow-sm ring-1 ring-ink/15 active:cursor-grabbing"
                />
                <p className="mt-2 text-center text-xs text-muted">Seret foto untuk menggeser posisi wajah.</p>
              </div>

              <div className="space-y-5">
                <Chips name="size" legend="Ukuran" value={size} onChange={setSize} options={(Object.keys(sizes) as Size[]).map((s) => ({ value: s, label: `${s} cm` }))} />
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Warna latar</legend>
                  <div className="flex gap-3">
                    {(Object.keys(bgColors) as Bg[]).map((b) => (
                      <label key={b} className="flex cursor-pointer flex-col items-center gap-1.5 text-xs">
                        <input type="radio" name="bg" className="peer sr-only" checked={bg === b} onChange={() => setBg(b)} />
                        <span
                          className="h-11 w-11 rounded-full ring-1 ring-ink/20 peer-checked:ring-[3px] peer-checked:ring-brand-500 peer-checked:ring-offset-2 peer-checked:ring-offset-ground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-brand-500"
                          style={{ background: bgColors[b] }}
                        />
                        <span className="capitalize">{b}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Slider label="Perbesar" value={zoom} display={`${Math.round(zoom * 100)}%`} min={0.6} max={2.5} step={0.02} onChange={setZoom} />
                <div className="flex flex-wrap gap-3 pt-1">
                  <Button onClick={downloadSingle}>Download pas foto</Button>
                  <Button variant="secondary" onClick={downloadSheet}>
                    Lembar cetak 4R ({perSheet} foto)
                  </Button>
                </div>
                <Panel className="text-sm text-muted">
                  Lembar 4R berukuran 10x15 cm. Cetak di tukang foto dengan pilihan "tanpa diperbesar" supaya ukurannya pas.
                </Panel>
              </div>
            </div>
          )}

          {status === 'error' && file && (
            <Button variant="secondary" className="mt-4" onClick={() => prepare(file, false)}>
              Lanjut tanpa hapus latar
            </Button>
          )}
        </div>
      )}
    </ToolShell>
  )
}
