import { useEffect, useRef, useState } from 'react'
import { deliver as saveAs } from '../lib/handoff'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { SortableList, DragHandle } from '../components/SortableList'

type Item = { id: string; url: string; bitmap: ImageBitmap }
type Ratio = '1:1' | '4:5' | '3:4' | '16:9' | '9:16'
type Fit = 'cover' | 'contain'
type Bg = 'white' | 'black' | 'transparent'

const MAX_ITEMS = 16
const LONG_SIDE = 2400

const ratios: Ratio[] = ['1:1', '4:5', '3:4', '16:9', '9:16']
const bgs: { value: Bg; label: string }[] = [
  { value: 'white', label: 'Putih' },
  { value: 'black', label: 'Hitam' },
  { value: 'transparent', label: 'Transparan' },
]

function canvasSize(ratio: Ratio) {
  const [w, h] = ratio.split(':').map(Number)
  return w >= h
    ? { width: LONG_SIDE, height: Math.round((LONG_SIDE * h) / w) }
    : { width: Math.round((LONG_SIDE * w) / h), height: LONG_SIDE }
}

// Splits n images into rows; a short last row stretches its cells to fill the width.
function rowsFor(n: number, cols: number) {
  const rows: number[] = []
  for (let left = n; left > 0; left -= cols) rows.push(Math.min(cols, left))
  return rows
}

function drawCollage(
  canvas: HTMLCanvasElement,
  items: Item[],
  opts: { ratio: Ratio; cols: number; gap: number; radius: number; fit: Fit; bg: Bg },
) {
  const { width, height } = canvasSize(opts.ratio)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)
  if (opts.bg !== 'transparent') {
    ctx.fillStyle = opts.bg === 'white' ? '#ffffff' : '#000000'
    ctx.fillRect(0, 0, width, height)
  }
  if (!items.length) return

  const rows = rowsFor(items.length, opts.cols)
  const gap = opts.gap
  const cellH = (height - gap * (rows.length + 1)) / rows.length
  let index = 0

  rows.forEach((count, r) => {
    const cellW = (width - gap * (count + 1)) / count
    const y = gap + r * (cellH + gap)
    for (let c = 0; c < count; c++) {
      const { bitmap } = items[index++]
      const x = gap + c * (cellW + gap)
      const scale =
        opts.fit === 'cover'
          ? Math.max(cellW / bitmap.width, cellH / bitmap.height)
          : Math.min(cellW / bitmap.width, cellH / bitmap.height)
      const w = bitmap.width * scale
      const h = bitmap.height * scale
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(x, y, cellW, cellH, Math.min(opts.radius, cellW / 2, cellH / 2))
      ctx.clip()
      ctx.drawImage(bitmap, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h)
      ctx.restore()
    }
  })
}

const chip = (active: boolean) =>
  `cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500 ${
    active ? 'bg-brand-500/10 text-brand-700 ring-1 ring-brand-500' : 'bg-ink/5 text-ink/65 hover:bg-ink/10'
  }`

export default function Collage() {
  const [items, setItems] = useState<Item[]>([])
  const [ratio, setRatio] = useState<Ratio>('1:1')
  const [colsSetting, setColsSetting] = useState<number | 'auto'>('auto')
  const [gap, setGap] = useState(24)
  const [radius, setRadius] = useState(0)
  const [fit, setFit] = useState<Fit>('cover')
  const [bg, setBg] = useState<Bg>('white')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const itemsRef = useRef<Item[]>([])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    return () => {
      for (const it of itemsRef.current) {
        URL.revokeObjectURL(it.url)
        it.bitmap.close()
      }
    }
  }, [])

  const cols = colsSetting === 'auto' ? Math.max(1, Math.ceil(Math.sqrt(items.length))) : colsSetting

  useEffect(() => {
    if (canvasRef.current) drawCollage(canvasRef.current, items, { ratio, cols, gap, radius, fit, bg })
  }, [items, ratio, cols, gap, radius, fit, bg])

  async function handleFiles(files: File[]) {
    setError('')
    const room = MAX_ITEMS - items.length
    if (files.length > room) setError(`Maksimal ${MAX_ITEMS} gambar per kolase.`)
    const loaded: Item[] = []
    for (const file of files.slice(0, Math.max(0, room))) {
      try {
        loaded.push({
          id: `${file.name}-${file.size}-${Math.random()}`,
          url: URL.createObjectURL(file),
          bitmap: await createImageBitmap(file),
        })
      } catch {
        setError(`"${file.name}" tidak bisa dibaca sebagai gambar.`)
      }
    }
    setItems((prev) => [...prev, ...loaded])
  }

  function remove(id: string) {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id)
      if (target) {
        URL.revokeObjectURL(target.url)
        target.bitmap.close()
      }
      return prev.filter((it) => it.id !== id)
    })
  }

  async function download() {
    const canvas = canvasRef.current
    if (!canvas || !items.length) return
    setWorking(true)
    const type = bg === 'transparent' ? 'image/png' : 'image/jpeg'
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92))
    setWorking(false)
    if (blob) saveAs(blob, `kolase.${type === 'image/png' ? 'png' : 'jpg'}`)
  }

  return (
    <ToolShell
      icon="collage"
      title="Kolase Gambar"
      description="Susun beberapa foto jadi satu gambar grid, siap dibagikan."
    >
      {items.length < MAX_ITEMS && (
        <Dropzone
          accept="image/png,image/jpeg,image/webp"
          multiple
          onFiles={handleFiles}
          label={items.length ? 'Tambah gambar lagi' : 'Klik atau drop gambar di sini'}
          hint={`Maksimal ${MAX_ITEMS} gambar, urutan bisa digeser`}
        />
      )}

      {error && (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <SortableList
              items={items}
              onReorder={setItems}
              strategy="grid"
              className="grid grid-cols-4 gap-2"
              renderItem={(item, dragHandleProps) => (
                <div className="group relative">
                  <img src={item.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <div className="absolute inset-x-1 top-1 flex justify-between">
                    <DragHandle {...dragHandleProps} />
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label="Hapus gambar"
                      className="rounded-full bg-ground/90 p-1.5 text-muted transition-colors hover:bg-red-500 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-500"
                    >
                      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3">
                        <path strokeLinecap="round" d="M4 4l8 8m0-8-8 8" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            />

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Rasio</legend>
              <div className="flex flex-wrap gap-2">
                {ratios.map((r) => (
                  <label key={r} className={chip(ratio === r)}>
                    <input type="radio" name="ratio" className="sr-only" checked={ratio === r} onChange={() => setRatio(r)} />
                    {r}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Kolom</legend>
              <div className="flex flex-wrap gap-2">
                {(['auto', 1, 2, 3, 4] as const).map((c) => (
                  <label key={c} className={chip(colsSetting === c)}>
                    <input
                      type="radio"
                      name="cols"
                      className="sr-only"
                      checked={colsSetting === c}
                      onChange={() => setColsSetting(c)}
                    />
                    {c === 'auto' ? 'Otomatis' : c}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="flex items-center justify-between text-sm">
                  <span>Jarak</span>
                  <span className="tabular-nums text-muted">{gap}px</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={4}
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-500"
                />
              </div>
              <div>
                <label className="flex items-center justify-between text-sm">
                  <span>Sudut membulat</span>
                  <span className="tabular-nums text-muted">{radius}px</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={120}
                  step={4}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-500"
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Gambar di kotak</legend>
              <div className="flex flex-wrap gap-2">
                <label className={chip(fit === 'cover')}>
                  <input type="radio" name="fit" className="sr-only" checked={fit === 'cover'} onChange={() => setFit('cover')} />
                  Isi penuh (dipotong)
                </label>
                <label className={chip(fit === 'contain')}>
                  <input type="radio" name="fit" className="sr-only" checked={fit === 'contain'} onChange={() => setFit('contain')} />
                  Utuh (tidak dipotong)
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Latar</legend>
              <div className="flex flex-wrap gap-2">
                {bgs.map((b) => (
                  <label key={b.value} className={chip(bg === b.value)}>
                    <input type="radio" name="bg" className="sr-only" checked={bg === b.value} onChange={() => setBg(b.value)} />
                    {b.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="md:sticky md:top-6 md:self-start">
            <p className="mb-2 text-sm font-medium text-muted">Pratinjau</p>
            <canvas
              ref={canvasRef}
              aria-label="Pratinjau kolase"
              className="block h-auto w-full rounded-xl bg-[conic-gradient(#0000000d_0_25%,#0000_0_50%)] bg-[length:20px_20px] ring-1 ring-ink/10"
            />
            <button
              type="button"
              onClick={download}
              disabled={working}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {working ? 'Menyimpan…' : `Download ${bg === 'transparent' ? 'PNG' : 'JPG'}`}
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
