import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react'

/** A box in fractions (0-1) of its stage, so it maps onto any output resolution. */
export type FracRect = { x: number; y: number; w: number; h: number }
type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move'

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

const handlePos: Record<Exclude<Handle, 'move'>, string> = {
  nw: 'left-0 top-0 cursor-nwse-resize',
  n: 'left-1/2 top-0 cursor-ns-resize',
  ne: 'left-full top-0 cursor-nesw-resize',
  e: 'left-full top-1/2 cursor-ew-resize',
  se: 'left-full top-full cursor-nwse-resize',
  s: 'left-1/2 top-full cursor-ns-resize',
  sw: 'left-0 top-full cursor-nesw-resize',
  w: 'left-0 top-1/2 cursor-ew-resize',
}

/**
 * Resizes `r` by a drag on `handle`. `ratio` is the box's height/width in fraction units
 * (pixel aspect already converted by the caller); null means free.
 */
function resize(r: FracRect, handle: Handle, dx: number, dy: number, ratio: number | null, min: number): FracRect {
  if (handle === 'move') return { ...r, x: clamp(r.x + dx, 0, 1 - r.w), y: clamp(r.y + dy, 0, 1 - r.h) }
  let { x, y, w, h } = r
  const right = x + w
  const bottom = y + h
  if (handle.includes('e')) w = clamp(w + dx, min, 1 - x)
  if (handle.includes('w')) {
    const nx = clamp(x + dx, 0, right - min)
    w = right - nx
    x = nx
  }
  if (handle.includes('s')) h = clamp(h + dy, min, 1 - y)
  if (handle.includes('n')) {
    const ny = clamp(y + dy, 0, bottom - min)
    h = bottom - ny
    y = ny
  }
  if (ratio) {
    // Width drives height, except on the top and bottom edges where height drives width.
    if (handle === 'n' || handle === 's') w = h / ratio
    else h = w * ratio
    // Shrink to fit inside the stage if the locked ratio pushed it out.
    const maxW = handle.includes('w') ? right : 1 - x
    const maxH = handle.includes('n') ? bottom : 1 - y
    const k = Math.min(1, maxW / w, maxH / h)
    w *= k
    h *= k
    if (handle.includes('w')) x = right - w
    if (handle.includes('n')) y = bottom - h
    if (handle === 'n' || handle === 's') x = clamp(r.x + (r.w - w) / 2, 0, 1 - w)
  }
  return { x, y, w, h }
}

export default function ResizableBox({
  stageRef,
  rect,
  onChange,
  ratio = null,
  grid = false,
  label,
  className = '',
  children,
  min = 0.03,
}: {
  stageRef: RefObject<HTMLElement | null>
  rect: FracRect
  onChange: (r: FracRect) => void
  ratio?: number | null
  grid?: boolean
  label: string
  className?: string
  children?: ReactNode
  min?: number
}) {
  const dragRef = useRef<{ handle: Handle; x: number; y: number; start: FracRect } | null>(null)

  function down(handle: Handle) {
    return (e: ReactPointerEvent<HTMLElement>) => {
      e.stopPropagation()
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { handle, x: e.clientX, y: e.clientY, start: rect }
    }
  }

  function move(e: ReactPointerEvent<HTMLElement>) {
    const d = dragRef.current
    const stage = stageRef.current
    if (!d || !stage) return
    const b = stage.getBoundingClientRect()
    onChange(resize(d.start, d.handle, (e.clientX - d.x) / b.width, (e.clientY - d.y) / b.height, ratio, min))
  }

  function end() {
    dragRef.current = null
  }

  // Arrow keys move the box, Shift+arrows resize it from the bottom-right: the whole tool works without a mouse.
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.altKey ? 0.002 : 0.01
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const v = map[e.key]
    if (!v) return
    e.preventDefault()
    onChange(resize(rect, e.shiftKey ? 'se' : 'move', v[0], v[1], ratio, min))
  }

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${label}. Seret untuk memindahkan, tarik titik di sisi atau pojok untuk mengubah ukuran. Panah untuk menggeser, Shift+panah untuk mengubah ukuran.`}
      onPointerDown={down('move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={onKey}
      onClick={(e) => e.stopPropagation()}
      className={`absolute cursor-move touch-none outline-none ring-2 ring-white focus-visible:ring-4 focus-visible:ring-brand-500 ${className}`}
      style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, boxShadow: '0 0 0 1px rgba(0,0,0,0.5)' }}
    >
      {children}
      {grid && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {[1, 2].map((i) => (
            <span key={`v${i}`} className="absolute inset-y-0 w-px bg-white/70" style={{ left: `${(i * 100) / 3}%` }} />
          ))}
          {[1, 2].map((i) => (
            <span key={`h${i}`} className="absolute inset-x-0 h-px bg-white/70" style={{ top: `${(i * 100) / 3}%` }} />
          ))}
        </div>
      )}
      {(Object.keys(handlePos) as (keyof typeof handlePos)[]).map((h) => (
        <span
          key={h}
          aria-hidden="true"
          onPointerDown={down(h)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          // 28px invisible hit area around a small visible square, easy to grab on touch screens.
          className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center ${handlePos[h]}`}
        >
          <span className={`block border-2 border-white bg-brand-500 shadow ${h.length === 2 ? 'h-3.5 w-3.5 rounded-sm' : 'h-2.5 w-5 rounded-full'} ${h === 'e' || h === 'w' ? 'rotate-90' : ''}`} />
        </span>
      ))}
    </div>
  )
}

/** Crop frame: darkened outside area, rule-of-thirds grid, eight handles. */
export function CropFrame({
  stageRef,
  rect,
  onChange,
  ratio,
}: {
  stageRef: RefObject<HTMLElement | null>
  rect: FracRect
  onChange: (r: FracRect) => void
  ratio?: number | null
}) {
  const pct = (v: number) => `${v * 100}%`
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 bg-black/55" style={{ height: pct(rect.y) }} />
        <div className="absolute inset-x-0 bottom-0 bg-black/55" style={{ height: pct(1 - rect.y - rect.h) }} />
        <div className="absolute left-0 bg-black/55" style={{ top: pct(rect.y), height: pct(rect.h), width: pct(rect.x) }} />
        <div className="absolute right-0 bg-black/55" style={{ top: pct(rect.y), height: pct(rect.h), width: pct(1 - rect.x - rect.w) }} />
      </div>
      <ResizableBox stageRef={stageRef} rect={rect} onChange={onChange} ratio={ratio} grid label="Area potong" />
    </>
  )
}
