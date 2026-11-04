import { useEffect, useState } from 'react'
import { trimToInk } from '../lib/trimCanvas'

type DateFormat = 'long' | 'short'

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function todayIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatStampText(iso: string, format: DateFormat, place: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  const date =
    format === 'long'
      ? `${d} ${months[m - 1]} ${y}`
      : `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  return place.trim() ? `${place.trim()}, ${date}` : date
}

// Rendered at a large size so the stamp stays crisp after it is scaled down onto the page.
function renderStamp(text: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 2000
  canvas.height = 160
  const ctx = canvas.getContext('2d')!
  ctx.font = '500 96px Helvetica, Arial, sans-serif'
  ctx.fillStyle = '#111827'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 16, canvas.height / 2, canvas.width - 32)
  return trimToInk(canvas, 6)
}

export default function DateStamp({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const [date, setDate] = useState(todayIso)
  const [format, setFormat] = useState<DateFormat>('long')
  const [place, setPlace] = useState('')
  const text = formatStampText(date, format, place)

  useEffect(() => {
    onChange(text ? renderStamp(text) : null)
  }, [text, onChange])

  const field =
    'mt-1 w-full rounded-lg bg-ground px-3 py-2 text-sm outline-none ring-1 ring-ink/10 focus-visible:ring-brand-500'

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="stamp-date" className="text-xs font-medium text-ink/60">
          Tanggal
        </label>
        <input id="stamp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor="stamp-place" className="text-xs font-medium text-ink/60">
          Tempat (opsional)
        </label>
        <input
          id="stamp-place"
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          maxLength={40}
          placeholder="mis. Batam"
          autoComplete="off"
          className={field}
        />
      </div>
      <div className="flex gap-1 rounded-full bg-ink/5 p-1 text-xs">
        {(['long', 'short'] as DateFormat[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            aria-pressed={format === f}
            className={`flex-1 rounded-full px-2 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 ${
              format === f ? 'bg-ground text-ink' : 'text-ink/55 hover:text-ink'
            }`}
          >
            {formatStampText(date || todayIso(), f, '')}
          </button>
        ))}
      </div>
      <p className="rounded-lg border border-dashed border-ink/20 bg-white px-3 py-2 text-center text-sm text-gray-900">
        {text || 'Pilih tanggal'}
      </p>
    </div>
  )
}
