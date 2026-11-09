import { useRef, useState } from 'react'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { CropFrame } from '../components/ResizableBox'
import type { FracRect } from '../components/ResizableBox'
import { Button, Chips, FileBar, baseName, canvasToBlob } from '../components/ui'
import { deliver } from '../lib/handoff'
import { formatBytes } from '../lib/format'

type Ratio = 'bebas' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16'
type Format = 'image/png' | 'image/jpeg' | 'image/webp'

const ratios: { value: Ratio; label: string; r: number | null }[] = [
  { value: 'bebas', label: 'Bebas', r: null },
  { value: '1:1', label: '1:1', r: 1 },
  { value: '4:3', label: '4:3', r: 4 / 3 },
  { value: '3:4', label: '3:4', r: 3 / 4 },
  { value: '16:9', label: '16:9', r: 16 / 9 },
  { value: '9:16', label: '9:16 (story)', r: 9 / 16 },
]

const full: FracRect = { x: 0, y: 0, w: 1, h: 1 }

export default function CropResize() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [rect, setRect] = useState<FracRect>(full)
  const [ratio, setRatio] = useState<Ratio>('bebas')
  const [outW, setOutW] = useState<number | null>(null)
  const [format, setFormat] = useState<Format>('image/jpeg')
  const [result, setResult] = useState<{ blob: Blob; url: string; w: number; h: number } | null>(null)
  const [working, setWorking] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)

  function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    const image = new Image()
    image.onload = () => {
      setImg(image)
      setFile(f)
      setRect(full)
      setRatio('bebas')
      setOutW(null)
      setResult(null)
      setFormat(f.type === 'image/png' ? 'image/png' : 'image/jpeg')
    }
    image.src = URL.createObjectURL(f)
  }

  const nw = img?.naturalWidth ?? 1
  const nh = img?.naturalHeight ?? 1
  // Locked pixel aspect (w/h) expressed as height/width in fraction units of this image.
  const r = ratios.find((x) => x.value === ratio)?.r ?? null
  const fracRatio = r ? nw / nh / r : null
  const cropW = Math.max(1, Math.round(rect.w * nw))
  const cropH = Math.max(1, Math.round(rect.h * nh))
  const finalW = outW ?? cropW
  const finalH = Math.max(1, Math.round((finalW * cropH) / cropW))

  function pickRatio(v: Ratio) {
    setRatio(v)
    setResult(null)
    const rr = ratios.find((x) => x.value === v)?.r
    if (!rr) return
    // Largest centered box with the chosen ratio.
    const fr = nw / nh / rr
    let w = 1
    let h = fr
    if (h > 1) {
      h = 1
      w = 1 / fr
    }
    setRect({ x: (1 - w) / 2, y: (1 - h) / 2, w, h })
    setOutW(null)
  }

  async function process() {
    if (!img || !file) return
    setWorking(true)
    try {
      const c = document.createElement('canvas')
      c.width = finalW
      c.height = finalH
      const ctx = c.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, finalW, finalH)
      }
      ctx.drawImage(img, rect.x * nw, rect.y * nh, rect.w * nw, rect.h * nh, 0, 0, finalW, finalH)
      const blob = await canvasToBlob(c, format, 0.92)
      setResult({ blob, url: URL.createObjectURL(blob), w: finalW, h: finalH })
    } finally {
      setWorking(false)
    }
  }

  const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg'

  return (
    <ToolShell icon="crop-resize" title="Crop & Resize" description="Potong bagian yang perlu, lalu atur ukuran akhirnya.">
      {!file && <Dropzone accept="image/png,image/jpeg,image/webp" onFiles={handleFiles} label="Pilih gambar" hint="JPG, PNG, atau WebP" />}

      {file && img && (
        <div>
          <FileBar name={file.name} detail={`${nw} x ${nh} px`} onChange={() => setFile(null)} />
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_17rem]">
            <div>
              <div className="flex justify-center rounded-xl bg-surface p-3 ring-1 ring-ink/10">
                <div ref={stageRef} className="relative inline-block max-w-full select-none">
                  <img src={img.src} alt="Gambar yang dipotong" draggable={false} className="block max-h-[min(70vh,36rem)] max-w-full" />
                  <CropFrame
                    stageRef={stageRef}
                    rect={rect}
                    onChange={(next) => {
                      setRect(next)
                      setResult(null)
                    }}
                    ratio={fracRatio}
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-muted">Tarik titik di sisi atau pojok untuk memotong, seret kotak untuk menggeser.</p>
            </div>

            <div className="space-y-5">
              <Chips name="ratio" legend="Rasio" value={ratio} onChange={pickRatio} options={ratios.map((x) => ({ value: x.value, label: x.label }))} />
              <div>
                <p className="text-sm font-medium">Ukuran hasil</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <label className="sr-only" htmlFor="out-w">
                    Lebar hasil
                  </label>
                  <input
                    id="out-w"
                    type="number"
                    min={1}
                    max={10000}
                    value={finalW}
                    onChange={(e) => {
                      setOutW(Math.max(1, Number(e.target.value) || 1))
                      setResult(null)
                    }}
                    className="min-h-11 w-24 rounded-lg bg-surface px-3 text-sm tabular-nums outline-none ring-1 ring-ink/15 focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                  <span className="text-muted">x</span>
                  <span className="min-w-12 text-sm tabular-nums">{finalH}</span>
                  <span className="text-sm text-muted">px</span>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Potongan asli {cropW} x {cropH} px. Tinggi mengikuti supaya tidak gepeng.
                </p>
                {outW !== null && (
                  <button type="button" onClick={() => setOutW(null)} className="mt-1 text-xs font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-500">
                    Pakai ukuran asli potongan
                  </button>
                )}
              </div>
              <Chips
                name="format"
                legend="Format"
                value={format}
                onChange={(v) => {
                  setFormat(v)
                  setResult(null)
                }}
                options={[
                  { value: 'image/jpeg', label: 'JPG' },
                  { value: 'image/png', label: 'PNG' },
                  { value: 'image/webp', label: 'WebP' },
                ]}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={process} disabled={working}>
                  {working ? 'Memproses…' : 'Potong & proses'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRect(full)
                    setRatio('bebas')
                    setOutW(null)
                    setResult(null)
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {result && (
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-surface p-4 ring-1 ring-ink/10" aria-live="polite">
              <img src={result.url} alt="Hasil potongan" className="max-h-40 rounded-lg ring-1 ring-ink/10" />
              <div>
                <p className="text-sm tabular-nums text-muted">
                  {result.w} x {result.h} px · {formatBytes(result.blob.size)}
                </p>
                <Button className="mt-3" onClick={() => deliver(result.blob, `${baseName(file.name)}-${result.w}x${result.h}.${ext}`)}>
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  )
}
