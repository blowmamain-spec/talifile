import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import ResizableBox from './ResizableBox'

/** A rectangle in fractions (0-1) of the image, so it maps to any output resolution. */
export type Rect = { id: string; x: number; y: number; w: number; h: number }

const clamp = (v: number, a = 0, b = 1) => Math.min(Math.max(v, a), b)

/**
 * Drag on the image to draw boxes. Used by Sensor Gambar and Sensor PDF.
 * Boxes are listed under the image too, so they can be removed by keyboard.
 */
export default function RectEditor({
  src,
  alt,
  rects,
  onChange,
  renderRect,
}: {
  src: string
  alt: string
  rects: Rect[]
  onChange: (rects: Rect[]) => void
  renderRect?: (r: Rect) => React.ReactNode
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const [draft, setDraft] = useState<Rect | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  function pos(e: ReactPointerEvent) {
    const r = stageRef.current!.getBoundingClientRect()
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) }
  }

  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    setSelected(null)
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = pos(e)
  }

  function move(e: ReactPointerEvent<HTMLDivElement>) {
    const s = startRef.current
    if (!s) return
    const p = pos(e)
    setDraft({ id: 'draft', x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) })
  }

  function up() {
    startRef.current = null
    if (draft && draft.w > 0.01 && draft.h > 0.01) {
      const id = `r-${Date.now()}-${Math.random()}`
      onChange([...rects, { ...draft, id }])
      setSelected(id)
    }
    setDraft(null)
  }

  const box = (r: Rect) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` })

  return (
    <div>
      <div
        ref={stageRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative cursor-crosshair touch-none select-none rounded-xl ring-1 ring-ink/15"
      >
        <img src={src} alt={alt} draggable={false} className="block w-full rounded-xl" />
        {rects.map((r, i) => {
          const fill = renderRect ? renderRect(r) : <div className="h-full w-full bg-black" />
          const tag = <span className="pointer-events-none absolute -left-px -top-5 rounded bg-ink px-1 text-[11px] font-medium text-ground">{i + 1}</span>
          // The selected box gets edge and corner handles; the others are clicked to select them.
          return r.id === selected ? (
            <ResizableBox
              key={r.id}
              stageRef={stageRef}
              rect={r}
              label={`Area ${i + 1}`}
              min={0.01}
              onChange={(n) => onChange(rects.map((x) => (x.id === r.id ? { ...x, ...n } : x)))}
            >
              <div className="pointer-events-none h-full w-full">{fill}</div>
              {tag}
            </ResizableBox>
          ) : (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              aria-label={`Pilih area ${i + 1} untuk diubah`}
              onPointerDown={(e) => {
                e.stopPropagation()
                setSelected(r.id)
              }}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelected(r.id)}
              className="absolute cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              style={box(r)}
            >
              <div className="pointer-events-none h-full w-full">{fill}</div>
              {tag}
            </div>
          )
        })}
        {draft && <div className="pointer-events-none absolute border-2 border-dashed border-accent-500 bg-accent-500/15" style={box(draft)} />}
      </div>

      {rects.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Area yang ditandai">
          {rects.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onChange(rects.filter((x) => x.id !== r.id))}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-3.5 text-sm ring-1 ring-ink/15 transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Hapus area {i + 1}
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3">
                  <path strokeLinecap="round" d="M4 4l8 8m0-8-8 8" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
