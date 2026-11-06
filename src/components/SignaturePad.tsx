import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import { trimToInk } from '../lib/trimCanvas'

type Mode = 'draw' | 'type' | 'upload'

const modeLabels: Record<Mode, string> = {
  draw: 'Gambar',
  type: 'Ketik',
  upload: 'Upload',
}

export default function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void
}) {
  const [mode, setMode] = useState<Mode>('draw')

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    onChange(null)
  }

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-full bg-ink/5 p-1 text-sm">
        {(Object.keys(modeLabels) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-pressed={mode === m}
            className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 ${
              mode === m ? 'bg-ground text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      {mode === 'draw' && <DrawPad onChange={onChange} />}
      {mode === 'type' && <TypePad onChange={onChange} />}
      {mode === 'upload' && <UploadPad onChange={onChange} />}
    </div>
  )
}

function DrawPad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
  }, [])

  // The canvas is CSS-scaled, so pointer coordinates must be mapped to its pixel grid.
  function getPos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    }
  }

  function start(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasInk.current = true
    setEmpty(false)
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    if (hasInk.current) {
      onChange(trimToInk(canvasRef.current!))
    }
  }

  function clear() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInk.current = false
    setEmpty(true)
    onChange(null)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={480}
        height={180}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="aspect-[480/180] w-full cursor-crosshair touch-none rounded-lg border border-dashed border-ink/20 bg-white"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted" aria-live="polite">
          {empty ? 'Gambar tanda tangan di atas' : 'Tanda tangan siap dipakai'}
        </p>
        <button
          type="button"
          onClick={clear}
          className="rounded-full bg-ink/5 px-3 py-1 text-xs text-muted transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
        >
          Hapus
        </button>
      </div>
    </div>
  )
}

async function renderTypedSignature(text: string): Promise<string | null> {
  if (!text.trim()) return null
  try {
    await document.fonts.load("600 64px 'Caveat'")
  } catch {
    // font failed to load, canvas will fall back to a default font
  }
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 180
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = "600 64px 'Caveat', cursive"
  ctx.fillStyle = '#111827'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text.trim(), canvas.width / 2, canvas.height / 2, canvas.width - 32)
  return trimToInk(canvas)
}

function TypePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const [text, setText] = useState('')

  useEffect(() => {
    let cancelled = false
    renderTypedSignature(text).then((dataUrl) => {
      if (!cancelled) onChange(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [text, onChange])

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={40}
        autoComplete="off"
        spellCheck={false}
        placeholder="Nama kamu"
        className="w-full rounded-lg bg-surface px-3 py-2 text-sm outline-none ring-1 ring-ink/15 focus-visible:ring-brand-500"
      />
      <div className="mt-2 flex h-[100px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-ink/20 bg-white">
        <span className="select-none px-4 text-4xl text-ink/90" style={{ fontFamily: "'Caveat', cursive" }}>
          {text.trim() || 'Pratinjau tanda tangan'}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted" aria-live="polite">
          {text.trim() ? 'Tanda tangan siap dipakai' : 'Ketik nama di atas'}
        </p>
        <button
          type="button"
          onClick={() => setText('')}
          className="rounded-full bg-ink/5 px-3 py-1 text-xs text-muted transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
        >
          Hapus
        </button>
      </div>
    </div>
  )
}

function UploadPad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      onChange(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function clear() {
    setPreview(null)
    onChange(null)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-[100px] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-ink/20 bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
      >
        {preview ? (
          <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="px-4 text-center text-sm text-muted">
            Klik untuk pilih file PNG tanda tangan
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png"
          className="hidden"
          tabIndex={-1}
          onChange={handleFile}
        />
      </button>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted" aria-live="polite">
          {preview ? 'Tanda tangan siap dipakai' : 'Idealnya PNG transparan'}
        </p>
        <button
          type="button"
          onClick={clear}
          className="rounded-full bg-ink/5 px-3 py-1 text-xs text-muted transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
        >
          Hapus
        </button>
      </div>
    </div>
  )
}
