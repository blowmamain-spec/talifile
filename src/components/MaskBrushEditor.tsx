import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Button, Chips, Panel, Slider, canvasToBlob } from './ui'
import { formatBytes } from '../lib/format'

type BrushMode = 'erase' | 'restore'
type EdgeStyle = 'tegas' | 'lembut'
type BgFill = 'transparan' | 'putih' | 'hitam' | 'merah' | 'biru' | 'kustom'

type Stroke = {
  mode: BrushMode
  edge: EdgeStyle
  /** Diameter in fraction of the shorter image side (0..1), resolution-independent. */
  sizeFrac: number
  /** Normalized coordinates (0..1) relative to canvas width/height. */
  points: [number, number][]
}

const PREVIEW_MAX_SIDE = 1400
const ZOOM_LEVELS = [1, 2, 3] as const

const BG_SWATCHES: { id: Exclude<BgFill, 'kustom'>; label: string; color: string | null }[] = [
  { id: 'transparan', label: 'Transparan', color: null },
  { id: 'putih', label: 'Putih', color: '#ffffff' },
  { id: 'hitam', label: 'Hitam', color: '#141414' },
  { id: 'merah', label: 'Merah', color: '#c8102e' },
  { id: 'biru', label: 'Biru', color: '#1f5fae' },
]

function resolveBgColor(bg: BgFill, customColor: string): string | null {
  if (bg === 'transparan') return null
  if (bg === 'kustom') return customColor
  return BG_SWATCHES.find((s) => s.id === bg)?.color ?? null
}

function drawSoftDab(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const grad = ctx.createRadialGradient(x, y, r * 0.35, x, y, r)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  mode: BrushMode,
  edge: EdgeStyle,
) {
  ctx.save()
  ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over'

  if (edge === 'tegas') {
    ctx.strokeStyle = '#ffffff'
    ctx.fillStyle = '#ffffff'
    ctx.lineWidth = radius * 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (x0 === x1 && y0 === y1) {
      ctx.beginPath()
      ctx.arc(x0, y0, radius, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
    }
  } else {
    const dist = Math.hypot(x1 - x0, y1 - y0)
    const step = Math.max(1.5, radius * 0.25)
    const steps = Math.max(1, Math.ceil(dist / step))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      drawSoftDab(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius)
    }
  }
  ctx.restore()
}

function replayStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number) {
  if (!stroke.points.length) return
  const radius = Math.max(1, (stroke.sizeFrac * Math.min(w, h)) / 2)
  const [fx, fy] = stroke.points[0]
  if (stroke.points.length === 1) {
    drawSegment(ctx, fx * w, fy * h, fx * w, fy * h, radius, stroke.mode, stroke.edge)
    return
  }
  for (let i = 1; i < stroke.points.length; i++) {
    const [x0, y0] = stroke.points[i - 1]
    const [x1, y1] = stroke.points[i]
    drawSegment(ctx, x0 * w, y0 * h, x1 * w, y1 * h, radius, stroke.mode, stroke.edge)
  }
}

function composeResult(
  target: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  orig: ImageBitmap,
  w: number,
  h: number,
  bgColor: string | null = null,
) {
  if (target.width !== w || target.height !== h) {
    target.width = w
    target.height = h
  }
  const ctx = target.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(mask, 0, 0, w, h)
  ctx.globalCompositeOperation = 'source-in'
  ctx.drawImage(orig, 0, 0, w, h)
  if (bgColor) {
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, w, h)
  }
  ctx.globalCompositeOperation = 'source-over'
}

export default function MaskBrushEditor({
  originalFile,
  originalUrl,
  resultBlob,
  onDownload,
  onResetFile,
}: {
  originalFile: File
  originalUrl: string
  resultBlob: Blob
  onDownload: (blob: Blob, filename: string) => void
  onResetFile: () => void
}) {
  const [mode, setMode] = useState<BrushMode>('erase')
  const [edge, setEdge] = useState<EdgeStyle>('lembut')
  /** Brush diameter as percentage of shorter image side (1% - 22%). */
  const [brushPct, setBrushPct] = useState(6)
  const [zoom, setZoom] = useState<(typeof ZOOM_LEVELS)[number]>(1)
  const [bgFill, setBgFill] = useState<BgFill>('transparan')
  const [customBg, setCustomBg] = useState('#e8f1eb')
  const [ghostOriginal, setGhostOriginal] = useState(false)
  const [peekOriginal, setPeekOriginal] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [redoStack, setRedoStack] = useState<Stroke[]>([])
  const [exporting, setExporting] = useState(false)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const bitmapsRef = useRef<{ orig: ImageBitmap; ai: ImageBitmap; pw: number; ph: number } | null>(null)
  const activeStrokeRef = useRef<Stroke | null>(null)
  const strokesRef = useRef<Stroke[]>([])

  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  const rebuildPreview = useCallback((list: Stroke[]) => {
    const bm = bitmapsRef.current
    const mask = maskCanvasRef.current
    const display = displayCanvasRef.current
    if (!bm || !mask || !display) return
    const mctx = mask.getContext('2d')!
    mctx.clearRect(0, 0, bm.pw, bm.ph)
    mctx.globalCompositeOperation = 'source-over'
    mctx.drawImage(bm.ai, 0, 0, bm.pw, bm.ph)
    for (const s of list) replayStroke(mctx, s, bm.pw, bm.ph)
    composeResult(display, mask, bm.orig, bm.pw, bm.ph)
  }, [])

  // Load original & AI result bitmaps once per processed image.
  useEffect(() => {
    const alive = { current: true }
    Promise.all([createImageBitmap(originalFile), createImageBitmap(resultBlob)]).then(([orig, ai]) => {
      if (!alive.current) {
        orig.close()
        ai.close()
        return
      }
      if (bitmapsRef.current) {
        bitmapsRef.current.orig.close()
        bitmapsRef.current.ai.close()
      }
      const scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(ai.width, ai.height))
      const pw = Math.max(1, Math.round(ai.width * scale))
      const ph = Math.max(1, Math.round(ai.height * scale))
      const mask = document.createElement('canvas')
      mask.width = pw
      mask.height = ph
      maskCanvasRef.current = mask
      bitmapsRef.current = { orig, ai, pw, ph }
      setDims({ w: ai.width, h: ai.height })
      setStrokes([])
      setRedoStack([])
      rebuildPreview([])
    })
    return () => {
      alive.current = false
      if (bitmapsRef.current) {
        bitmapsRef.current.orig.close()
        bitmapsRef.current.ai.close()
        bitmapsRef.current = null
      }
    }
  }, [originalFile, resultBlob, rebuildPreview])

  // Track rendered stage size so the floating brush cursor circle matches real brush diameter even when zoomed.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setStageSize({ w: r.width, h: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [dims, zoom])

  const undo = useCallback(() => {
    setStrokes((prev) => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      const next = prev.slice(0, -1)
      setRedoStack((r) => [...r, last])
      rebuildPreview(next)
      return next
    })
  }, [rebuildPreview])

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      const nextRedo = prev.slice(0, -1)
      setStrokes((s) => {
        const next = [...s, last]
        rebuildPreview(next)
        return next
      })
      return nextRedo
    })
  }, [rebuildPreview])

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z / Ctrl+Y (redo).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  function pointFromEvent(e: ReactPointerEvent<HTMLDivElement>): { nx: number; ny: number; lx: number; ly: number } | null {
    const el = stageRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const lx = e.clientX - rect.left
    const ly = e.clientY - rect.top
    return {
      nx: Math.min(Math.max(lx / rect.width, 0), 1),
      ny: Math.min(Math.max(ly / rect.height, 0), 1),
      lx,
      ly,
    }
  }

  function applyLiveSegment(from: [number, number], to: [number, number], stroke: Stroke) {
    const bm = bitmapsRef.current
    const mask = maskCanvasRef.current
    const display = displayCanvasRef.current
    if (!bm || !mask || !display) return
    const mctx = mask.getContext('2d')!
    const radius = Math.max(1, (stroke.sizeFrac * Math.min(bm.pw, bm.ph)) / 2)
    drawSegment(mctx, from[0] * bm.pw, from[1] * bm.ph, to[0] * bm.pw, to[1] * bm.ph, radius, stroke.mode, stroke.edge)
    composeResult(display, mask, bm.orig, bm.pw, bm.ph)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || peekOriginal) return
    const pt = pointFromEvent(e)
    if (!pt) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const stroke: Stroke = {
      mode,
      edge,
      sizeFrac: brushPct / 100,
      points: [[pt.nx, pt.ny]],
    }
    activeStrokeRef.current = stroke
    setCursor({ x: pt.lx, y: pt.ly, visible: e.pointerType !== 'touch' })
    applyLiveSegment([pt.nx, pt.ny], [pt.nx, pt.ny], stroke)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const pt = pointFromEvent(e)
    if (!pt) return
    setCursor({ x: pt.lx, y: pt.ly, visible: e.pointerType !== 'touch' })
    const s = activeStrokeRef.current
    if (!s) return
    const prev = s.points[s.points.length - 1]
    const next: [number, number] = [pt.nx, pt.ny]
    s.points.push(next)
    applyLiveSegment(prev, next, s)
  }

  function finishStroke() {
    const finished = activeStrokeRef.current
    if (!finished) return
    activeStrokeRef.current = null
    setStrokes((prev) => [...prev, finished])
    setRedoStack([])
  }

  function resetBrush() {
    setStrokes([])
    setRedoStack([])
    rebuildPreview([])
  }

  const activeBgColor = resolveBgColor(bgFill, customBg)

  async function handleDownload() {
    const bm = bitmapsRef.current
    const base = originalFile.name.replace(/\.[^.]+$/, '')
    const filename = activeBgColor ? `${base}-bg.png` : `${base}-no-bg.png`
    // If untouched and transparent, deliver the original AI blob directly without re-encoding.
    if (!strokesRef.current.length && !activeBgColor && bm) {
      onDownload(resultBlob, filename)
      return
    }
    if (!bm) {
      onDownload(resultBlob, filename)
      return
    }
    setExporting(true)
    try {
      const w = bm.ai.width
      const h = bm.ai.height
      const fullMask = document.createElement('canvas')
      fullMask.width = w
      fullMask.height = h
      const mctx = fullMask.getContext('2d')!
      mctx.drawImage(bm.ai, 0, 0, w, h)
      for (const s of strokesRef.current) replayStroke(mctx, s, w, h)

      const fullOut = document.createElement('canvas')
      composeResult(fullOut, fullMask, bm.orig, w, h, activeBgColor)
      const blob = await canvasToBlob(fullOut, 'image/png')
      onDownload(blob, filename)
    } finally {
      setExporting(false)
    }
  }

  const cursorDiameterPx = Math.max(8, (brushPct / 100) * Math.min(stageSize.w, stageSize.h))
  const showGhost = ghostOriginal || mode === 'restore'

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19.5rem] lg:items-start">
      {/* Left: Large interactive canvas stage with zoom viewport */}
      <div>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="tabular-nums text-muted">
            {dims ? `${dims.w} × ${dims.h} px` : 'Menyiapkan pratinjau…'} · Asli {formatBytes(originalFile.size)}
            {!strokes.length && !activeBgColor && ` → Hasil ${formatBytes(resultBlob.size)}`}
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <div role="group" aria-label="Perbesar pratinjau" className="inline-flex rounded-full bg-surface p-0.5 ring-1 ring-ink/12">
              {ZOOM_LEVELS.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  aria-pressed={zoom === z}
                  className={`min-h-7 cursor-pointer rounded-full px-2.5 text-xs font-medium tabular-nums transition-colors ${
                    zoom === z ? 'bg-ink text-ground' : 'text-muted hover:text-ink'
                  }`}
                >
                  {z}×
                </button>
              ))}
            </div>

            <button
              type="button"
              onPointerDown={() => setPeekOriginal(true)}
              onPointerUp={() => setPeekOriginal(false)}
              onPointerLeave={() => setPeekOriginal(false)}
              onPointerCancel={() => setPeekOriginal(false)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') setPeekOriginal(true)
              }}
              onKeyUp={() => setPeekOriginal(false)}
              className="inline-flex min-h-8 cursor-pointer select-none items-center rounded-full bg-surface px-3 font-medium text-ink ring-1 ring-ink/12 transition-colors hover:ring-brand-500"
            >
              {peekOriginal ? 'Menampilkan foto asli' : 'Tahan lihat asli'}
            </button>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-auto rounded-2xl bg-surface p-3 ring-1 ring-ink/10 sm:p-4">
          <div className={zoom === 1 ? 'flex justify-center' : 'inline-block min-w-full'}>
            <div
              ref={stageRef}
              role="application"
              aria-label="Kanvas rapikan background dengan kuas. Seret untuk menghapus atau mengembalikan bagian gambar."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              onPointerLeave={() => setCursor((c) => ({ ...c, visible: false }))}
              className={`relative overflow-hidden rounded-xl ring-1 ring-ink/15 select-none touch-none ${
                activeBgColor ? '' : 'checker-mini'
              }`}
              style={
                dims
                  ? {
                      aspectRatio: `${dims.w} / ${dims.h}`,
                      width: zoom === 1 ? '100%' : `${zoom * 100}%`,
                      maxWidth: zoom === 1 ? `calc(66vh * ${dims.w / dims.h})` : 'none',
                      backgroundColor: activeBgColor ?? undefined,
                      cursor: peekOriginal ? 'default' : 'none',
                    }
                  : undefined
              }
            >
              {/* Ghost original underneath so the user can see deleted pixels when restoring */}
              <img
                src={originalUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
                className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-150 ${
                  peekOriginal ? 'z-20 opacity-100' : showGhost ? 'opacity-28' : 'opacity-0'
                }`}
              />

              {/* Editable transparent result */}
              <canvas ref={displayCanvasRef} className="relative z-10 block h-full w-full" />

              {/* Live brush cursor ring */}
              {cursor.visible && !peekOriginal && (
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                    mode === 'erase' ? 'border-accent-500 bg-accent-500/15' : 'border-brand-500 bg-brand-500/15'
                  }`}
                  style={{
                    left: cursor.x,
                    top: cursor.y,
                    width: cursorDiameterPx,
                    height: cursorDiameterPx,
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.85)',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <p className="mt-2.5 text-center text-xs text-muted">
          {mode === 'erase'
            ? 'Usap bagian yang masih ingin dihapus agar menjadi transparan.'
            : 'Usap bagian yang tidak sengaja terhapus AI untuk mengembalikannya dari foto asli.'}
          {zoom > 1 && ' Gunakan scrollbar untuk menggeser area zoom.'}
        </p>
      </div>

      {/* Right: Brush controls, optional background color & download */}
      <div className="space-y-4">
        <Panel className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Rapikan dengan kuas</h2>
            {strokes.length > 0 && (
              <span className="text-xs tabular-nums text-muted">{strokes.length} sapuan</span>
            )}
          </div>

          <Chips
            name="brush-mode"
            legend="Mode kuas"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'erase', label: 'Hapus' },
              { value: 'restore', label: 'Kembalikan' },
            ]}
          />

          <Slider
            label="Ukuran kuas"
            value={brushPct}
            display={`${brushPct}%`}
            min={1}
            max={22}
            step={1}
            onChange={setBrushPct}
          />

          <Chips
            name="brush-edge"
            legend="Tepi kuas"
            value={edge}
            onChange={setEdge}
            options={[
              { value: 'lembut', label: 'Lembut' },
              { value: 'tegas', label: 'Tegas' },
            ]}
          />

          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={showGhost}
              disabled={mode === 'restore'}
              onChange={(e) => setGhostOriginal(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            <span>
              Tampilkan foto asli samar{mode === 'restore' ? ' (otomatis saat Kembalikan)' : ''}
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="secondary"
              disabled={!strokes.length}
              onClick={undo}
              className="flex-1 !min-h-9 !px-3 !text-xs"
            >
              Undo
            </Button>
            <Button
              variant="secondary"
              disabled={!redoStack.length}
              onClick={redo}
              className="flex-1 !min-h-9 !px-3 !text-xs"
            >
              Redo
            </Button>
            <Button
              variant="secondary"
              disabled={!strokes.length}
              onClick={resetBrush}
              className="!min-h-9 !px-3 !text-xs"
            >
              Reset
            </Button>
          </div>
        </Panel>

        <Panel className="space-y-3">
          <p className="text-sm font-semibold">Latar hasil</p>
          <div className="flex flex-wrap items-center gap-2">
            {BG_SWATCHES.map((sw) => {
              const active = bgFill === sw.id
              return (
                <button
                  key={sw.id}
                  type="button"
                  onClick={() => setBgFill(sw.id)}
                  title={sw.label}
                  aria-label={`Latar ${sw.label}`}
                  aria-pressed={active}
                  className={`h-8 w-8 cursor-pointer rounded-full ring-1 ring-ink/20 transition-transform ${
                    sw.color === null ? 'checker-mini' : ''
                  } ${active ? 'scale-105 ring-2 ring-brand-500 ring-offset-2 ring-offset-surface' : 'hover:scale-105'}`}
                  style={sw.color ? { backgroundColor: sw.color } : undefined}
                />
              )
            })}

            <label
              title="Pilih warna lain"
              className={`relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-ground px-2.5 text-xs font-medium ring-1 transition-colors ${
                bgFill === 'kustom' ? 'ring-2 ring-brand-500 text-ink' : 'ring-ink/15 text-muted hover:text-ink'
              }`}
            >
              <span
                className="h-4 w-4 rounded-full ring-1 ring-ink/20"
                style={{ backgroundColor: customBg }}
              />
              <span>Lainnya</span>
              <input
                type="color"
                value={customBg}
                onChange={(e) => {
                  setCustomBg(e.target.value)
                  setBgFill('kustom')
                }}
                aria-label="Pilih warna latar kustom"
                className="sr-only"
              />
            </label>
          </div>
        </Panel>

        <div className="space-y-2.5">
          <Button onClick={handleDownload} disabled={exporting} className="w-full">
            {exporting ? 'Menyiapkan PNG…' : activeBgColor ? 'Download PNG (dengan latar)' : 'Download PNG transparan'}
          </Button>
          <Button variant="secondary" onClick={onResetFile} className="w-full">
            Ganti gambar
          </Button>
        </div>
      </div>
    </div>
  )
}
