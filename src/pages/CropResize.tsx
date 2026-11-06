import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import ToolShell from '../components/ToolShell'
import { offerFromUrl } from '../lib/handoff'
import Dropzone from '../components/Dropzone'
import { formatBytes } from '../lib/format'

type Box = { x: number; y: number; w: number; h: number }
type Drag = { mode: 'move' | 'resize'; startX: number; startY: number; startBox: Box } | null

const MAX_DISPLAY = 480
const MIN_BOX = 24

export default function CropResize() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 })
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [lockAspect, setLockAspect] = useState(true)
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png')
  const [working, setWorking] = useState(false)
  const [result, setResult] = useState<{ url: string; size: number } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag>(null)

  function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setResult(null)
    const url = URL.createObjectURL(f)
    const image = new Image()
    image.onload = () => {
      const s = Math.min(MAX_DISPLAY / image.naturalWidth, MAX_DISPLAY / image.naturalHeight, 1)
      setScale(s)
      const displayW = image.naturalWidth * s
      const displayH = image.naturalHeight * s
      setImg(image)
      setFile(f)
      setBox({ x: 0, y: 0, w: displayW, h: displayH })
    }
    image.src = url
  }

  useEffect(() => {
    if (!img || !scale) return
    setWidth(Math.round(box.w / scale))
    setHeight(Math.round(box.h / scale))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, scale])

  function displayBounds() {
    return { w: img!.naturalWidth * scale, h: img!.naturalHeight * scale }
  }

  function clampBox(next: Box): Box {
    const { w: maxW, h: maxH } = displayBounds()
    const w = Math.min(Math.max(next.w, MIN_BOX), maxW)
    const h = Math.min(Math.max(next.h, MIN_BOX), maxH)
    const x = Math.min(Math.max(next.x, 0), maxW - w)
    const y = Math.min(Math.max(next.y, 0), maxH - h)
    return { x, y, w, h }
  }

  function startDrag(mode: 'move' | 'resize') {
    return (e: ReactPointerEvent) => {
      e.stopPropagation()
      dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startBox: box }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  function onDragMove(e: ReactPointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (drag.mode === 'move') {
      setBox(clampBox({ ...drag.startBox, x: drag.startBox.x + dx, y: drag.startBox.y + dy }))
    } else {
      setBox(clampBox({ ...drag.startBox, w: drag.startBox.w + dx, h: drag.startBox.h + dy }))
    }
  }

  function endDrag() {
    dragRef.current = null
  }

  function resetCrop() {
    const { w, h } = displayBounds()
    setBox({ x: 0, y: 0, w, h })
  }

  function updateWidth(next: number) {
    if (lockAspect && box.w) {
      const ratio = box.h / box.w
      setHeight(Math.round(next * ratio))
    }
    setWidth(next)
  }

  function updateHeight(next: number) {
    if (lockAspect && box.h) {
      const ratio = box.w / box.h
      setWidth(Math.round(next * ratio))
    }
    setHeight(next)
  }

  async function process() {
    if (!img || !file) return
    setWorking(true)
    try {
      const naturalX = box.x / scale
      const naturalY = box.y / scale
      const naturalW = box.w / scale
      const naturalH = box.h / scale

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, width, height)
      }
      ctx.drawImage(img, naturalX, naturalY, naturalW, naturalH, 0, 0, width, height)

      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b!), format, 0.92),
      )
      setResult({ url: URL.createObjectURL(blob), size: blob.size })
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell
      icon="crop-resize"
      title="Crop &amp; Resize"
      description="Potong dan ubah ukuran gambar langsung di browser."
    >
      {!file && (
        <Dropzone
          accept="image/png,image/jpeg,image/webp"
          onFiles={handleFiles}
          label="Klik atau drop gambar di sini"
          hint="JPG, PNG, atau WebP"
        />
      )}

      {file && img && (
        <div>
          <div
            ref={stageRef}
            className="relative select-none overflow-hidden rounded-xl bg-[conic-gradient(#0000000d_0_25%,#0000_0_50%)] bg-[length:20px_20px] ring-1 ring-ink/10"
            style={{ width: displayBounds().w, height: displayBounds().h }}
          >
            <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
            <div
              onPointerDown={startDrag('move')}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              className="absolute cursor-move touch-none ring-2 ring-brand-500"
              style={{ left: box.x, top: box.y, width: box.w, height: box.h, background: 'rgba(34,122,69,0.12)' }}
            >
              <div
                onPointerDown={startDrag('resize')}
                onPointerMove={onDragMove}
                onPointerUp={endDrag}
                className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize touch-none rounded-full bg-brand-500 ring-2 ring-white"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs tabular-nums text-muted">
              {img.naturalWidth}×{img.naturalHeight}px asli
            </p>
            <button
              type="button"
              onClick={resetCrop}
              className="rounded-full bg-ink/5 px-3 py-1 text-xs text-muted transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
            >
              Reset crop
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-xs">
            <div>
              <label htmlFor="crop-width" className="text-sm font-medium">
                Lebar
              </label>
              <input
                id="crop-width"
                type="number"
                min={1}
                value={width}
                onChange={(e) => updateWidth(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg bg-surface px-3 py-2 text-sm tabular-nums outline-none ring-1 ring-ink/15 focus-visible:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="crop-height" className="text-sm font-medium">
                Tinggi
              </label>
              <input
                id="crop-height"
                type="number"
                min={1}
                value={height}
                onChange={(e) => updateHeight(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg bg-surface px-3 py-2 text-sm tabular-nums outline-none ring-1 ring-ink/15 focus-visible:ring-brand-500"
              />
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={lockAspect}
              onChange={(e) => setLockAspect(e.target.checked)}
              className="accent-brand-500"
            />
            Kunci rasio
          </label>

          <fieldset className="mt-5 flex flex-wrap items-center gap-5">
            <legend className="sr-only">Format output</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="format"
                checked={format === 'image/png'}
                onChange={() => setFormat('image/png')}
                className="accent-brand-500"
              />
              PNG
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="format"
                checked={format === 'image/jpeg'}
                onChange={() => setFormat('image/jpeg')}
                className="accent-brand-500"
              />
              JPG
            </label>
          </fieldset>

          <button
            type="button"
            onClick={process}
            disabled={working || width < 1 || height < 1}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Memproses…' : 'Proses gambar'}
          </button>

          {result && (
            <div className="mt-6 rounded-xl bg-surface ring-1 ring-ink/10 p-4" aria-live="polite">
              <img src={result.url} alt="Hasil crop dan resize" className="max-h-72 rounded-lg" />
              <p className="mt-3 text-sm tabular-nums text-muted">{formatBytes(result.size)}</p>
              <a
                href={result.url}
                download={`${file.name.replace(/\.[^.]+$/, '')}-${width}x${height}.${format === 'image/png' ? 'png' : 'jpg'}`}
                onClick={() => offerFromUrl(result.url, `${file.name.replace(/\.[^.]+$/, '')}-${width}x${height}.${format === 'image/png' ? 'png' : 'jpg'}`)}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
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
