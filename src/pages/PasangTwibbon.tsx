import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import ToolShell from '../components/ToolShell'
import { Button, Chips, ErrorText, Panel, Slider, TextField, baseName, canvasToBlob } from '../components/ui'
import { clearLastOutput, deliver, takePendingFiles } from '../lib/handoff'

type BgMode = 'putih' | 'hitam' | 'transparan'
type OutputFormat = 'png' | 'jpg'

type FrameData = {
  file: File
  bitmap: ImageBitmap
  thumbUrl: string
  hasTransparency: boolean
}

type PhotoLayer = {
  id: string
  name: string
  bitmap: ImageBitmap
  thumbUrl: string
  /** Center position in canvas fractions (0.5 = center). */
  cx: number
  cy: number
  /** Relative to contain-fit against the frame canvas. */
  scale: number
  /** Degrees (-180 to 180). */
  rotation: number
  flipX: boolean
}

type TextLayer = {
  id: string
  text: string
  /** Center position in canvas fractions (0..1). */
  x: number
  y: number
  /** Font size as percentage of canvas shorter side (2..12). */
  sizePct: number
  color: string
  bold: boolean
  shadow: boolean
}

const TEXT_SWATCHES = ['#ffffff', '#16140f', '#facc15', '#c8102e', '#1f5fae']

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp'
const FRAME_ACCEPT = 'image/png,image/webp,image/jpeg'
const PREVIEW_MAX_SIDE = 1280
const MIN_SCALE = 0.1
const MAX_SCALE = 3.5

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

function isAcceptedImage(file: File) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name)
}

/** Checks whether the image has any translucent or transparent pixels on a downscaled copy. */
function detectTransparency(bitmap: ImageBitmap): boolean {
  const max = 256
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return true
  ctx.drawImage(bitmap, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true
  }
  return false
}

/** Contain-fit base scale so scale=1 fits the whole photo inside the canvas. */
function baseScaleOf(photo: PhotoLayer, cw: number, ch: number) {
  return Math.min(cw / photo.bitmap.width, ch / photo.bitmap.height)
}

/** Cover-fit scale value in PhotoLayer units so the photo fills the frame with no gap. */
function coverScaleOf(photo: PhotoLayer, cw: number, ch: number) {
  const contain = baseScaleOf(photo, cw, ch)
  const cover = Math.max(cw / photo.bitmap.width, ch / photo.bitmap.height)
  return clamp(cover / contain, MIN_SCALE, MAX_SCALE)
}

function photoBoxSize(photo: PhotoLayer, cw: number, ch: number) {
  const s = baseScaleOf(photo, cw, ch) * photo.scale
  return { w: photo.bitmap.width * s, h: photo.bitmap.height * s }
}

/** Hit-tests canvas pixel point (px, py) against a rotated photo layer. */
function hitTestPhoto(photo: PhotoLayer, px: number, py: number, cw: number, ch: number) {
  const { w, h } = photoBoxSize(photo, cw, ch)
  const dx = px - photo.cx * cw
  const dy = py - photo.cy * ch
  const rad = (-photo.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const lx = dx * cos - dy * sin
  const ly = dx * sin + dy * cos
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2
}

function renderComposition(
  canvas: HTMLCanvasElement,
  frame: FrameData,
  photos: PhotoLayer[],
  texts: TextLayer[],
  options: { bg: BgMode; frameAlpha: number; maxSide?: number },
) {
  const fw = frame.bitmap.width
  const fh = frame.bitmap.height
  const ratio = options.maxSide ? Math.min(1, options.maxSide / Math.max(fw, fh)) : 1
  const cw = Math.max(1, Math.round(fw * ratio))
  const ch = Math.max(1, Math.round(fh * ratio))

  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw
    canvas.height = ch
  }

  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, cw, ch)

  if (options.bg === 'putih') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cw, ch)
  } else if (options.bg === 'hitam') {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, cw, ch)
  }

  for (const photo of photos) {
    const { w, h } = photoBoxSize(photo, cw, ch)
    ctx.save()
    ctx.translate(photo.cx * cw, photo.cy * ch)
    ctx.rotate((photo.rotation * Math.PI) / 180)
    if (photo.flipX) ctx.scale(-1, 1)
    ctx.drawImage(photo.bitmap, -w / 2, -h / 2, w, h)
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = options.frameAlpha
  ctx.drawImage(frame.bitmap, 0, 0, cw, ch)
  ctx.restore()

  // Optional caption/name texts drawn above the twibbon frame.
  const shortSide = Math.min(cw, ch)
  for (const t of texts) {
    const content = t.text.trim()
    if (!content) continue
    const fontPx = Math.max(12, (shortSide * t.sizePct) / 100)
    ctx.save()
    ctx.font = `${t.bold ? 700 : 500} ${fontPx}px system-ui, 'Segoe UI', Roboto, sans-serif`
    ctx.fillStyle = t.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (t.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.48)'
      ctx.shadowBlur = Math.max(4, fontPx * 0.22)
      ctx.shadowOffsetY = Math.max(1, fontPx * 0.06)
    }
    ctx.fillText(content, t.x * cw, t.y * ch, cw * 0.92)
    ctx.restore()
  }
}

type DragState =
  | { kind: 'move'; photoId: string; startX: number; startY: number; startCx: number; startCy: number }
  | { kind: 'resize'; photoId: string; centerX: number; centerY: number; startDist: number; startScale: number }
  | { kind: 'move-text'; textId: string; startX: number; startY: number; startTx: number; startTy: number }

export default function PasangTwibbon() {
  const [frame, setFrame] = useState<FrameData | null>(null)
  const [photos, setPhotos] = useState<PhotoLayer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [texts, setTexts] = useState<TextLayer[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [bg, setBg] = useState<BgMode>('putih')
  const [format, setFormat] = useState<OutputFormat>('png')
  const [peekFrame, setPeekFrame] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [frameDragOver, setFrameDragOver] = useState(false)
  const [photoDragOver, setPhotoDragOver] = useState(false)

  const frameInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ photoId: string; startDist: number; startScale: number } | null>(null)
  const sliderTimerRef = useRef<number | null>(null)
  const frameRef = useRef<FrameData | null>(null)
  const photosRef = useRef<PhotoLayer[]>([])
  const addPhotosRef = useRef<(files: File[]) => Promise<void>>(async () => {})

  useEffect(() => {
    frameRef.current = frame
    photosRef.current = photos
  }, [frame, photos])

  const selectedPhoto = photos.find((p) => p.id === selectedId) ?? null
  const selectedText = texts.find((t) => t.id === selectedTextId) ?? null
  const dimFrame = isAdjusting || peekFrame

  // Clean up bitmaps and object URLs on unmount.
  useEffect(() => {
    return () => {
      if (sliderTimerRef.current) window.clearTimeout(sliderTimerRef.current)
      if (frameRef.current) {
        frameRef.current.bitmap.close()
        URL.revokeObjectURL(frameRef.current.thumbUrl)
      }
      for (const p of photosRef.current) {
        p.bitmap.close()
        URL.revokeObjectURL(p.thumbUrl)
      }
    }
  }, [])

  const loadFrame = useCallback(async (file: File) => {
    if (!isAcceptedImage(file)) {
      setError('Frame twibbon harus berupa file gambar PNG, WebP, atau JPG.')
      return
    }
    try {
      clearLastOutput()
      const bitmap = await createImageBitmap(file)
      const hasTransparency = detectTransparency(bitmap)
      const thumbUrl = URL.createObjectURL(file)
      setFrame((prev) => {
        if (prev) {
          prev.bitmap.close()
          URL.revokeObjectURL(prev.thumbUrl)
        }
        return { file, bitmap, thumbUrl, hasTransparency }
      })
      setError('')
    } catch {
      setError('Frame twibbon tidak bisa dibaca. Pastikan filenya gambar yang valid.')
    }
  }, [])

  const addPhotos = useCallback(async (files: File[]) => {
    const valid = files.filter(isAcceptedImage)
    if (!valid.length) {
      setError('Format foto tidak didukung. Gunakan PNG, JPG, atau WebP.')
      return
    }
    try {
      clearLastOutput()
      const existingCount = photosRef.current.length
      const currentFrame = frameRef.current
      const added: PhotoLayer[] = []

      for (let i = 0; i < valid.length; i++) {
        const f = valid[i]
        const bitmap = await createImageBitmap(f)
        const thumbUrl = URL.createObjectURL(f)
        const idx = existingCount + i
        const isFirst = idx === 0

        // Spread additional photos slightly so the user immediately sees each added layer.
        const shift = isFirst ? 0 : (((idx % 5) - 2) * 0.06)
        const draft: PhotoLayer = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: f.name,
          bitmap,
          thumbUrl,
          cx: clamp(0.5 + shift, 0.2, 0.8),
          cy: clamp(0.5 + (isFirst ? 0 : ((idx % 3) - 1) * 0.05), 0.2, 0.8),
          scale: isFirst ? 1 : 0.65,
          rotation: 0,
          flipX: false,
        }
        if (isFirst && currentFrame) {
          draft.scale = coverScaleOf(draft, currentFrame.bitmap.width, currentFrame.bitmap.height)
        }
        added.push(draft)
      }

      setPhotos((prev) => [...prev, ...added])
      setSelectedId(added[added.length - 1].id)
      setError(valid.length < files.length ? 'Sebagian file dilewati karena bukan gambar.' : '')
    } catch {
      setError('Ada foto yang tidak bisa dibaca. Coba pilih file gambar lain.')
    }
  }, [])

  useEffect(() => {
    addPhotosRef.current = addPhotos
  }, [addPhotos])

  // Accept files handed over from another tool or Android share sheet as inner photos.
  useEffect(() => {
    const pending = takePendingFiles(IMAGE_ACCEPT)
    if (pending && pending.length) {
      void addPhotosRef.current(pending)
    }
  }, [])

  // Paste image with Ctrl+V: fills frame first if empty, otherwise adds as photo.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? []).filter(isAcceptedImage)
      if (!files.length) return
      e.preventDefault()
      if (!frameRef.current && files.length === 1) {
        void loadFrame(files[0])
      } else {
        void addPhotos(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addPhotos, loadFrame])

  // Render preview canvas whenever state changes.
  useEffect(() => {
    if (!canvasRef.current || !frame) return
    renderComposition(canvasRef.current, frame, photos, texts, {
      bg,
      frameAlpha: dimFrame ? 0.4 : 1,
      maxSide: PREVIEW_MAX_SIDE,
    })
  }, [frame, photos, texts, bg, dimFrame])

  function updatePhoto(id: string, patch: Partial<PhotoLayer>) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function addTextLayer() {
    const idx = texts.length
    const layer: TextLayer = {
      id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: idx === 0 ? 'Nama Lengkap' : 'Jabatan / Instansi',
      x: 0.5,
      y: clamp(0.84 + idx * 0.06, 0.15, 0.94),
      sizePct: idx === 0 ? 4.8 : 3.4,
      color: '#ffffff',
      bold: idx === 0,
      shadow: true,
    }
    setTexts((prev) => [...prev, layer])
    setSelectedTextId(layer.id)
    setSelectedId(null)
  }

  function updateText(id: string, patch: Partial<TextLayer>) {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function removeText(id: string) {
    setTexts((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (selectedTextId === id) setSelectedTextId(next[next.length - 1]?.id ?? null)
      return next
    })
  }

  /** Briefly dims the frame while slider or keyboard adjustments happen, then restores it. */
  function pulseAdjusting() {
    setIsAdjusting(true)
    if (sliderTimerRef.current) window.clearTimeout(sliderTimerRef.current)
    sliderTimerRef.current = window.setTimeout(() => {
      if (!dragRef.current && !pinchRef.current) setIsAdjusting(false)
    }, 450)
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) {
        target.bitmap.close()
        URL.revokeObjectURL(target.thumbUrl)
      }
      const next = prev.filter((p) => p.id !== id)
      if (selectedId === id) setSelectedId(next[next.length - 1]?.id ?? null)
      return next
    })
  }

  function moveLayer(id: string, direction: 'up' | 'down') {
    setPhotos((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx < 0) return prev
      // Higher index draws on top of lower index.
      const target = direction === 'up' ? idx + 1 : idx - 1
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[target]] = [copy[target], copy[idx]]
      return copy
    })
  }

  function resetPhoto(id: string) {
    const p = photos.find((item) => item.id === id)
    if (!p || !frame) return
    updatePhoto(id, {
      cx: 0.5,
      cy: 0.5,
      scale: photos.length === 1 ? coverScaleOf(p, frame.bitmap.width, frame.bitmap.height) : 0.7,
      rotation: 0,
      flipX: false,
    })
    pulseAdjusting()
  }

  function fitCoverPhoto(id: string) {
    const p = photos.find((item) => item.id === id)
    if (!p || !frame) return
    updatePhoto(id, {
      cx: 0.5,
      cy: 0.5,
      scale: coverScaleOf(p, frame.bitmap.width, frame.bitmap.height),
    })
    pulseAdjusting()
  }

  // Stage pointer handlers: click-to-select, drag-to-move (texts & photos), and two-finger pinch-to-zoom.
  function onStagePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!frame || !stageRef.current || (!photos.length && !texts.length)) return
    if ((e.target as HTMLElement).dataset.handle === 'resize') return

    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two pointers active: switch to pinch zoom for the active photo.
    if (pointersRef.current.size === 2) {
      const targetId = selectedId ?? photos[photos.length - 1]?.id
      const active = photos.find((p) => p.id === targetId)
      if (active) {
        const pts = Array.from(pointersRef.current.values())
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
        dragRef.current = null
        pinchRef.current = { photoId: active.id, startDist: Math.max(10, dist), startScale: active.scale }
        setSelectedTextId(null)
        setSelectedId(active.id)
        setIsAdjusting(true)
      }
      return
    }

    const rect = stageRef.current.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width
    const ny = (e.clientY - rect.top) / rect.height

    // Hit-test text layers first because they sit above the frame.
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i]
      if (!t.text.trim()) continue
      const halfH = Math.max(0.04, (t.sizePct / 100) * 0.9)
      const halfW = Math.min(0.46, Math.max(0.14, t.text.length * (t.sizePct / 100) * 0.34))
      if (Math.abs(nx - t.x) <= halfW && Math.abs(ny - t.y) <= halfH) {
        setSelectedTextId(t.id)
        setSelectedId(null)
        dragRef.current = {
          kind: 'move-text',
          textId: t.id,
          startX: e.clientX,
          startY: e.clientY,
          startTx: t.x,
          startTy: t.y,
        }
        return
      }
    }

    const px = nx * frame.bitmap.width
    const py = ny * frame.bitmap.height

    // Hit-test topmost photo first; fall back to currently selected photo so dragging still feels natural.
    let hit: PhotoLayer | null = null
    for (let i = photos.length - 1; i >= 0; i--) {
      if (hitTestPhoto(photos[i], px, py, frame.bitmap.width, frame.bitmap.height)) {
        hit = photos[i]
        break
      }
    }
    const target = hit ?? selectedPhoto
    if (!target) return

    setSelectedTextId(null)
    setSelectedId(target.id)
    dragRef.current = {
      kind: 'move',
      photoId: target.id,
      startX: e.clientX,
      startY: e.clientY,
      startCx: target.cx,
      startCy: target.cy,
    }
    setIsAdjusting(true)
  }

  function onStagePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!stageRef.current) return
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const nextScale = clamp(pinchRef.current.startScale * (dist / pinchRef.current.startDist), MIN_SCALE, MAX_SCALE)
      updatePhoto(pinchRef.current.photoId, { scale: nextScale })
      return
    }

    const d = dragRef.current
    if (!d) return

    const rect = stageRef.current.getBoundingClientRect()
    if (d.kind === 'move') {
      const dx = (e.clientX - d.startX) / rect.width
      const dy = (e.clientY - d.startY) / rect.height
      updatePhoto(d.photoId, {
        cx: clamp(d.startCx + dx, -0.5, 1.5),
        cy: clamp(d.startCy + dy, -0.5, 1.5),
      })
    } else if (d.kind === 'resize') {
      const dist = Math.hypot(e.clientX - d.centerX, e.clientY - d.centerY)
      const nextScale = clamp(d.startScale * (dist / d.startDist), MIN_SCALE, MAX_SCALE)
      updatePhoto(d.photoId, { scale: nextScale })
    } else if (d.kind === 'move-text') {
      const dx = (e.clientX - d.startX) / rect.width
      const dy = (e.clientY - d.startY) / rect.height
      updateText(d.textId, {
        x: clamp(d.startTx + dx, 0.04, 0.96),
        y: clamp(d.startTy + dy, 0.04, 0.96),
      })
    }
  }

  function endPointer(e: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) {
      dragRef.current = null
      setIsAdjusting(false)
    }
  }

  function onResizeHandleDown(e: ReactPointerEvent<HTMLSpanElement>) {
    if (!selectedPhoto || !stageRef.current) return
    e.stopPropagation()
    e.preventDefault()
    stageRef.current.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const rect = stageRef.current.getBoundingClientRect()
    const centerX = rect.left + selectedPhoto.cx * rect.width
    const centerY = rect.top + selectedPhoto.cy * rect.height
    const startDist = Math.max(12, Math.hypot(e.clientX - centerX, e.clientY - centerY))
    dragRef.current = {
      kind: 'resize',
      photoId: selectedPhoto.id,
      centerX,
      centerY,
      startDist,
      startScale: selectedPhoto.scale,
    }
    setIsAdjusting(true)
  }

  // Arrow keys move the active photo or text, Shift+Up/Down scales photo.
  function onStageKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.altKey ? 0.002 : 0.01
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }

    if (selectedText) {
      const move = moves[e.key]
      if (!move) return
      e.preventDefault()
      updateText(selectedText.id, {
        x: clamp(selectedText.x + move[0], 0.04, 0.96),
        y: clamp(selectedText.y + move[1], 0.04, 0.96),
      })
      return
    }

    if (!selectedPhoto) return
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      const delta = e.key === 'ArrowUp' ? 0.04 : -0.04
      updatePhoto(selectedPhoto.id, { scale: clamp(selectedPhoto.scale + delta, MIN_SCALE, MAX_SCALE) })
      pulseAdjusting()
      return
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    updatePhoto(selectedPhoto.id, {
      cx: clamp(selectedPhoto.cx + move[0], -0.5, 1.5),
      cy: clamp(selectedPhoto.cy + move[1], -0.5, 1.5),
    })
    pulseAdjusting()
  }

  function handleBgChange(nextBg: BgMode) {
    setBg(nextBg)
    if (nextBg === 'transparan' && format === 'jpg') setFormat('png')
  }

  async function download() {
    if (!frame || !photos.length) return
    setDownloading(true)
    setError('')
    try {
      const out = document.createElement('canvas')
      const effectiveBg: BgMode = format === 'jpg' && bg === 'transparan' ? 'putih' : bg
      renderComposition(out, frame, photos, texts, { bg: effectiveBg, frameAlpha: 1 })
      const mime = format === 'png' ? 'image/png' : 'image/jpeg'
      const blob = await canvasToBlob(out, mime, format === 'jpg' ? 0.94 : undefined)
      deliver(blob, `${baseName(frame.file.name)}-twibbon.${format}`)
    } catch (err) {
      console.error(err)
      setError('Gagal membuat gambar hasil. Coba lagi atau pakai ukuran file yang lebih ringan.')
    } finally {
      setDownloading(false)
    }
  }

  function handleFrameDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setFrameDragOver(false)
    const f = Array.from(e.dataTransfer.files)[0]
    if (f) void loadFrame(f)
  }

  function handlePhotoDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setPhotoDragOver(false)
    const fs = Array.from(e.dataTransfer.files)
    if (fs.length) void addPhotos(fs)
  }

  // Geometry for the selected photo's interactive outline in percentage of the stage.
  const selectedBox =
    frame && selectedPhoto
      ? (() => {
          const { w, h } = photoBoxSize(selectedPhoto, frame.bitmap.width, frame.bitmap.height)
          return {
            leftPct: selectedPhoto.cx * 100,
            topPct: selectedPhoto.cy * 100,
            widthPct: (w / frame.bitmap.width) * 100,
            heightPct: (h / frame.bitmap.height) * 100,
            rotation: selectedPhoto.rotation,
          }
        })()
      : null

  return (
    <ToolShell
      icon="pasang-twibbon"
      title="Pasang Twibbon"
      description="Pasang satu atau beberapa foto ke dalam frame twibbon, lalu atur posisi, ukuran, dan rotasinya langsung di browser."
    >
      {/* Hidden inputs shared by initial upload cards and editor buttons */}
      <input
        ref={frameInputRef}
        type="file"
        accept={FRAME_ACCEPT}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void loadFrame(f)
          e.target.value = ''
        }}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? [])
          if (fs.length) void addPhotos(fs)
          e.target.value = ''
        }}
      />

      {/* Two dedicated upload places: Frame Twibbon and Inner Photos */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Slot 1: Frame Twibbon */}
        {!frame ? (
          <button
            type="button"
            onClick={() => frameInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setFrameDragOver(true)
            }}
            onDragLeave={() => setFrameDragOver(false)}
            onDrop={handleFrameDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 ${
              frameDragOver ? 'border-brand-500 bg-brand-500/5' : 'border-ink/15 bg-surface hover:border-brand-400'
            }`}
          >
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <rect x="7" y="7" width="10" height="10" rx="1.5" strokeDasharray="2.5 2" />
              </svg>
            </span>
            <span className="mt-3 block font-medium">1. Pilih Frame Twibbon</span>
            <span className="mt-1 block text-xs text-muted">PNG atau WebP dengan lubang transparan. Bisa drop di sini.</span>
          </button>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-ink/10">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={frame.thumbUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-contain ring-1 ring-ink/10"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, rgba(128,128,128,0.16) 25%, transparent 25%), linear-gradient(-45deg, rgba(128,128,128,0.16) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.16) 75%), linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.16) 75%)',
                  backgroundSize: '10px 10px',
                  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
                }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">Frame Twibbon</p>
                <p className="truncate text-sm font-medium">{frame.file.name}</p>
                <p className="text-xs tabular-nums text-muted">
                  {frame.bitmap.width} × {frame.bitmap.height} px
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => frameInputRef.current?.click()} className="shrink-0 !min-h-9 !px-3.5">
              Ganti frame
            </Button>
          </div>
        )}

        {/* Slot 2: Inner Photos */}
        {!photos.length ? (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setPhotoDragOver(true)
            }}
            onDragLeave={() => setPhotoDragOver(false)}
            onDrop={handlePhotoDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 ${
              photoDragOver ? 'border-brand-500 bg-brand-500/5' : 'border-ink/15 bg-surface hover:border-brand-400'
            }`}
          >
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
                <rect x="3" y="5" width="14" height="14" rx="2.5" />
                <circle cx="8" cy="10" r="1.5" />
                <path strokeLinejoin="round" d="M3 16l4-4 3 3 2.5-2.8L17 17" />
                <path strokeLinecap="round" d="M20 8v6m-3-3h6" />
              </svg>
            </span>
            <span className="mt-3 block font-medium">2. Pilih Foto di Dalam</span>
            <span className="mt-1 block text-xs text-muted">Bisa pilih lebih dari 1 foto sekaligus (JPG, PNG, WebP).</span>
          </button>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-ink/10">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden">
                {photos.slice(-3).map((p) => (
                  <img key={p.id} src={p.thumbUrl} alt="" className="h-11 w-11 rounded-lg object-cover ring-2 ring-surface" />
                ))}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">Foto di Dalam</p>
                <p className="text-sm font-medium tabular-nums">{photos.length} foto terpasang</p>
                <p className="truncate text-xs text-muted">Bisa tambah lagi atau atur urutan layer</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => photoInputRef.current?.click()} className="shrink-0 !min-h-9 !px-3.5">
              + Tambah foto
            </Button>
          </div>
        )}
      </div>

      <ErrorText>{error}</ErrorText>

      {frame && !frame.hasTransparency && (
        <Panel className="mt-4 border-l-4 border-l-accent-500 text-sm">
          <p className="font-medium">Frame ini tidak memiliki area transparan.</p>
          <p className="mt-0.5 text-muted">
            Foto di belakangnya mungkin akan tertutup penuh. Pastikan kamu mengupload file twibbon format PNG atau WebP yang bagian fotonya sudah berlubang transparan.
          </p>
        </Panel>
      )}

      {/* Workspace editor once frame is loaded */}
      {frame && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          {/* Canvas column */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="tabular-nums text-muted">
                Resolusi hasil: <strong className="font-medium text-ink">{frame.bitmap.width} × {frame.bitmap.height} px</strong>
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface px-3 py-1.5 font-medium ring-1 ring-ink/10 transition-colors hover:ring-brand-500">
                <input
                  type="checkbox"
                  checked={peekFrame}
                  onChange={(e) => setPeekFrame(e.target.checked)}
                  className="h-3.5 w-3.5 accent-brand-500"
                />
                <span>Frame semi-transparan</span>
              </label>
            </div>

            <div className="flex justify-center rounded-2xl bg-surface p-3 ring-1 ring-ink/10 sm:p-4">
              <div
                ref={stageRef}
                role="application"
                tabIndex={photos.length ? 0 : -1}
                aria-label="Kanvas pasang twibbon. Seret foto untuk menggeser posisi, tarik sudut untuk mengubah ukuran, atau gunakan tombol panah."
                onPointerDown={onStagePointerDown}
                onPointerMove={onStagePointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
                onKeyDown={onStageKeyDown}
                className="relative max-w-full overflow-hidden rounded-xl ring-1 ring-ink/15 select-none touch-none outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                style={{
                  aspectRatio: `${frame.bitmap.width} / ${frame.bitmap.height}`,
                  width: '100%',
                  maxWidth: `calc(70vh * ${frame.bitmap.width / frame.bitmap.height})`,
                  backgroundImage:
                    'linear-gradient(45deg, rgba(128,128,128,0.14) 25%, transparent 25%), linear-gradient(-45deg, rgba(128,128,128,0.14) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.14) 75%), linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.14) 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                }}
              >
                <canvas ref={canvasRef} className={`block h-full w-full ${photos.length ? 'cursor-grab active:cursor-grabbing' : ''}`} />

                {/* Interactive bounding box & corner resize handles for the active photo */}
                {selectedBox && (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute border-2 border-dashed transition-opacity ${
                      dimFrame ? 'border-brand-500 opacity-100' : 'border-brand-500/75 opacity-80'
                    }`}
                    style={{
                      left: `${selectedBox.leftPct}%`,
                      top: `${selectedBox.topPct}%`,
                      width: `${selectedBox.widthPct}%`,
                      height: `${selectedBox.heightPct}%`,
                      transform: `translate(-50%, -50%) rotate(${selectedBox.rotation}deg)`,
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.75)',
                    }}
                  >
                    {[
                      'left-0 top-0 cursor-nwse-resize',
                      'left-full top-0 cursor-nesw-resize',
                      'left-full top-full cursor-nwse-resize',
                      'left-0 top-full cursor-nesw-resize',
                    ].map((pos, idx) => (
                      <span
                        key={idx}
                        data-handle="resize"
                        onPointerDown={onResizeHandleDown}
                        className={`pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center ${pos}`}
                      >
                        <span className="block h-3.5 w-3.5 rounded-sm border-2 border-white bg-brand-500 shadow" />
                      </span>
                    ))}
                  </div>
                )}

                {dimFrame && (
                  <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-ground">
                    Mode atur foto (frame transparan)
                  </span>
                )}

                {selectedText && selectedText.text.trim() && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-md border border-dashed border-brand-500 bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-700"
                    style={{ left: `${selectedText.x * 100}%`, top: `${Math.max(4, selectedText.y * 100 - selectedText.sizePct * 1.15)}%` }}
                  >
                    Teks terpilih (seret untuk geser)
                  </span>
                )}
              </div>
            </div>

            <p className="mt-2.5 text-center text-xs text-muted">
              {photos.length
                ? 'Seret foto untuk menggeser, tarik sudut hijau untuk ubah ukuran, atau cubit dua jari di layar sentuh. Frame otomatis semi-transparan saat mengatur foto.'
                : 'Frame sudah siap. Tambahkan minimal 1 foto untuk mulai mengatur posisinya.'}
            </p>
          </div>

          {/* Controls column */}
          <div className="space-y-5">
            {/* Layer list */}
            <Panel className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Daftar Foto ({photos.length})</h2>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex min-h-9 items-center rounded-full bg-brand-500/12 px-3 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  + Tambah foto
                </button>
              </div>

              {!photos.length ? (
                <p className="text-xs text-muted">Belum ada foto. Klik "+ Tambah foto" di atas untuk memasukkan satu atau beberapa foto ke dalam twibbon.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {[...photos].reverse().map((p, revIdx) => {
                      const actualIdx = photos.length - 1 - revIdx
                      const active = p.id === selectedId
                      const isTop = actualIdx === photos.length - 1
                      const isBottom = actualIdx === 0
                      return (
                        <li
                          key={p.id}
                          className={`flex items-center gap-2.5 rounded-xl p-2 transition-colors ${
                            active ? 'bg-brand-500/10 ring-1 ring-brand-500' : 'bg-ground ring-1 ring-ink/8'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTextId(null)
                              setSelectedId(p.id)
                            }}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                          >
                            <img src={p.thumbUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-ink/10" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium">{p.name}</span>
                              <span className="block text-[11px] tabular-nums text-muted">
                                {Math.round(p.scale * 100)}% · {p.rotation}°
                              </span>
                            </span>
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5">
                            {photos.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  disabled={isTop}
                                  onClick={() => moveLayer(p.id, 'up')}
                                  aria-label={`Majukan layer ${p.name}`}
                                  title="Majukan layer"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs text-muted transition-colors hover:bg-ink/8 hover:text-ink disabled:opacity-30"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={isBottom}
                                  onClick={() => moveLayer(p.id, 'down')}
                                  aria-label={`Mundurkan layer ${p.name}`}
                                  title="Mundurkan layer"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs text-muted transition-colors hover:bg-ink/8 hover:text-ink disabled:opacity-30"
                                >
                                  ↓
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => removePhoto(p.id)}
                              aria-label={`Hapus ${p.name}`}
                              title="Hapus foto"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                            >
                              ×
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  {photos.length > 1 && (
                    <p className="text-[11px] text-muted">Foto teratas di daftar tampil paling depan, dan semua foto tetap berada di belakang frame twibbon.</p>
                  )}
                </>
              )}
            </Panel>

            {/* Active photo controls */}
            {selectedPhoto && (
              <Panel className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-sm font-semibold">Atur: {selectedPhoto.name}</h2>
                  <button
                    type="button"
                    onClick={() => resetPhoto(selectedPhoto.id)}
                    className="shrink-0 text-xs font-medium text-muted underline underline-offset-4 hover:text-ink"
                  >
                    Reset
                  </button>
                </div>

                <Slider
                  label="Ukuran foto"
                  value={selectedPhoto.scale}
                  display={`${Math.round(selectedPhoto.scale * 100)}%`}
                  min={MIN_SCALE}
                  max={MAX_SCALE}
                  step={0.01}
                  onChange={(v) => {
                    updatePhoto(selectedPhoto.id, { scale: v })
                    pulseAdjusting()
                  }}
                />

                <Slider
                  label="Rotasi"
                  value={selectedPhoto.rotation}
                  display={`${selectedPhoto.rotation}°`}
                  min={-180}
                  max={180}
                  step={1}
                  onChange={(v) => {
                    updatePhoto(selectedPhoto.id, { rotation: v })
                    pulseAdjusting()
                  }}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      updatePhoto(selectedPhoto.id, { flipX: !selectedPhoto.flipX })
                      pulseAdjusting()
                    }}
                    className="!min-h-9 !px-3.5 !text-xs"
                  >
                    {selectedPhoto.flipX ? 'Balik: Aktif' : 'Balik cermin'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      updatePhoto(selectedPhoto.id, { cx: 0.5, cy: 0.5 })
                      pulseAdjusting()
                    }}
                    className="!min-h-9 !px-3.5 !text-xs"
                  >
                    Tengahkan
                  </Button>
                  <Button variant="secondary" onClick={() => fitCoverPhoto(selectedPhoto.id)} className="!min-h-9 !px-3.5 !text-xs">
                    Penuhi frame
                  </Button>
                </div>
              </Panel>
            )}

            {/* Optional text layers (name, role, event caption) */}
            <Panel className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Teks Nama / Jabatan ({texts.length})</h2>
                <button
                  type="button"
                  onClick={addTextLayer}
                  className="inline-flex min-h-9 items-center rounded-full bg-brand-500/12 px-3 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  + Tambah teks
                </button>
              </div>

              {!texts.length ? (
                <p className="text-xs text-muted">Opsional. Tambahkan nama atau jabatan di atas frame twibbon, lalu seret posisinya langsung di kanvas.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {texts.map((t, i) => {
                      const active = t.id === selectedTextId
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTextId(t.id)
                            setSelectedId(null)
                          }}
                          className={`inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
                            active ? 'bg-brand-500/12 text-brand-700 ring-1 ring-brand-500' : 'bg-ground text-ink/80 ring-1 ring-ink/10 hover:text-ink'
                          }`}
                        >
                          <span className="truncate max-w-36">{t.text.trim() || `Teks ${i + 1}`}</span>
                        </button>
                      )
                    })}
                  </div>

                  {selectedText && (
                    <div className="space-y-3 border-t border-ink/8 pt-3">
                      <TextField
                        label="Isi teks"
                        value={selectedText.text}
                        maxLength={80}
                        placeholder="mis. Budi Santoso - Panitia"
                        onChange={(e) => updateText(selectedText.id, { text: e.target.value })}
                      />

                      <Slider
                        label="Ukuran teks"
                        value={selectedText.sizePct}
                        display={`${selectedText.sizePct.toFixed(1)}%`}
                        min={2}
                        max={12}
                        step={0.2}
                        onChange={(v) => updateText(selectedText.id, { sizePct: v })}
                      />

                      <div>
                        <span className="mb-1.5 block text-xs font-medium">Warna teks</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {TEXT_SWATCHES.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateText(selectedText.id, { color: c })}
                              aria-label={`Warna ${c}`}
                              className={`h-7 w-7 cursor-pointer rounded-full ring-1 ring-ink/20 ${
                                selectedText.color.toLowerCase() === c ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface' : ''
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-ground px-2.5 text-xs ring-1 ring-ink/15">
                            <span className="h-3.5 w-3.5 rounded-full ring-1 ring-ink/20" style={{ backgroundColor: selectedText.color }} />
                            <span>Lainnya</span>
                            <input
                              type="color"
                              value={selectedText.color}
                              onChange={(e) => updateText(selectedText.id, { color: e.target.value })}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <label className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={selectedText.bold}
                            onChange={(e) => updateText(selectedText.id, { bold: e.target.checked })}
                            className="h-3.5 w-3.5 accent-brand-500"
                          />
                          <span>Tebal</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={selectedText.shadow}
                            onChange={(e) => updateText(selectedText.id, { shadow: e.target.checked })}
                            className="h-3.5 w-3.5 accent-brand-500"
                          />
                          <span>Bayangan halus</span>
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => updateText(selectedText.id, { x: 0.5 })}
                          className="flex-1 !min-h-8 !px-3 !text-xs"
                        >
                          Tengahkan
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => removeText(selectedText.id)}
                          className="!min-h-8 !px-3 !text-xs"
                        >
                          Hapus teks
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Panel>

            {/* Output settings */}
            <Panel className="space-y-4">
              <Chips
                name="twibbon-bg"
                legend="Latar belakang celah"
                value={bg}
                onChange={handleBgChange}
                options={[
                  { value: 'putih', label: 'Putih' },
                  { value: 'hitam', label: 'Hitam' },
                  { value: 'transparan', label: 'Transparan' },
                ]}
              />
              <Chips
                name="twibbon-format"
                legend="Format hasil"
                value={format}
                onChange={setFormat}
                options={[
                  { value: 'png', label: 'PNG (tajam)' },
                  { value: 'jpg', label: 'JPG (ringan)' },
                ]}
              />
              {format === 'jpg' && bg === 'transparan' && (
                <p className="-mt-2 text-xs text-muted">Format JPG tidak mendukung transparan, celah kosong akan diisi putih.</p>
              )}
              <Button onClick={download} disabled={!photos.length || downloading} className="w-full">
                {downloading ? 'Memproses…' : 'Download Twibbon'}
              </Button>
            </Panel>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
