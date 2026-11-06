import type { ButtonHTMLAttributes, ReactNode } from 'react'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const look =
    variant === 'primary'
      ? 'bg-brand-500 text-on-brand hover:bg-brand-600'
      : variant === 'danger'
        ? 'bg-surface text-danger ring-1 ring-ink/15 hover:bg-ink/5'
        : 'bg-surface text-ink ring-1 ring-ink/15 hover:bg-ink/5'
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${look} ${focus} ${className}`}
    />
  )
}

/** The loaded file with a way back out, shown at the top of single-file tools. */
export function FileBar({ name, detail, onChange }: { name: string; detail?: string; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3 ring-1 ring-ink/10">
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        {detail && <p className="text-sm tabular-nums text-muted">{detail}</p>}
      </div>
      <Button variant="secondary" onClick={onChange} className="shrink-0 !min-h-9 !px-4">
        Ganti file
      </Button>
    </div>
  )
}

export function Chips<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  name,
}: {
  legend: string
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  name: string
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value
          return (
            <label
              key={String(o.value)}
              className={`flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500 ${
                active ? 'bg-brand-500/12 text-brand-700 ring-1 ring-brand-500' : 'bg-surface text-ink/70 ring-1 ring-ink/10 hover:text-ink'
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={active} onChange={() => onChange(o.value)} />
              {o.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function Slider({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  display?: string
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-brand-500"
      />
    </label>
  )
}

export function TextField({
  label,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      <input
        autoComplete="off"
        {...props}
        className="mt-1.5 w-full rounded-lg bg-surface px-3 py-2 text-sm outline-none ring-1 ring-ink/15 focus-visible:ring-2 focus-visible:ring-brand-500"
      />
    </label>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="mt-4 text-sm text-danger" role="alert">
      {children}
    </p>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-surface p-4 ring-1 ring-ink/10 ${className}`}>{children}</div>
}

/** Loads an image file into a canvas-ready bitmap with its natural size. */
export async function loadBitmap(file: File) {
  return createImageBitmap(file)
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat gambar'))), type, quality),
  )
}

export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '')
}
