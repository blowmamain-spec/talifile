import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PDFEmbeddedPage, PDFPage } from 'pdf-lib'
import { degrees } from 'pdf-lib'
import { loadPdfDocument, renderPageToCanvas } from './pdfjs'
import { friendlyPdfError } from './pdfErrors'

export type PagePreview = { dataUrl: string; widthPt: number; heightPt: number }

export function usePdfDoc(file: File | null) {
  // Results are tagged with the file they came from, so a stale load never shows for a newer file.
  const [state, setState] = useState<{ file: File; doc: PDFDocumentProxy | null; error: string } | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    loadPdfDocument(file)
      .then((doc) => !cancelled && setState({ file, doc, error: '' }))
      .catch((err) => {
        console.error(err)
        if (!cancelled) setState({ file, doc: null, error: friendlyPdfError(err, 'Gagal membuka PDF. Pastikan file tidak rusak.') })
      })
    return () => {
      cancelled = true
    }
  }, [file])

  const current = file && state?.file === file ? state : null
  return { doc: current?.doc ?? null, error: current?.error ?? '', loading: !!file && !current }
}

/** Renders one page on demand and keeps earlier renders, so flipping back is instant. */
export function usePagePreview(doc: PDFDocumentProxy | null, index: number, scale = 1.4) {
  const [store, setStore] = useState<{ doc: PDFDocumentProxy | null; pages: Record<number, PagePreview> }>({ doc: null, pages: {} })
  const cached = store.doc === doc ? store.pages[index] : undefined

  useEffect(() => {
    if (!doc || cached) return
    let cancelled = false
    ;(async () => {
      const page = await doc.getPage(index + 1)
      const vp = page.getViewport({ scale: 1 })
      const canvas = await renderPageToCanvas(page, scale)
      if (cancelled) return
      const preview = { dataUrl: canvas.toDataURL('image/jpeg', 0.85), widthPt: vp.width, heightPt: vp.height }
      setStore((s) => ({ doc, pages: { ...(s.doc === doc ? s.pages : {}), [index]: preview } }))
    })().catch(console.error)
    return () => {
      cancelled = true
    }
  }, [doc, index, scale, cached])

  return cached ?? null
}

export function PageNav({ index, count, onChange, extra }: { index: number; count: number; onChange: (i: number) => void; extra?: string }) {
  const btn =
    'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-surface px-3 text-sm font-medium sm:px-4 ring-1 ring-ink/15 transition-colors hover:bg-ink/5 disabled:opacity-40 disabled:hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onChange(index - 1)} aria-label="Halaman sebelumnya">
        ←<span className="hidden sm:inline">Sebelumnya</span>
      </button>
      <p className="text-center text-sm tabular-nums text-muted" aria-live="polite">
        Halaman {index + 1} / {count}
        {extra && <span className="block sm:inline"> · {extra}</span>}
      </p>
      <button type="button" className={btn} disabled={index >= count - 1} onClick={() => onChange(index + 1)} aria-label="Halaman berikutnya">
        <span className="hidden sm:inline">Berikutnya</span>→
      </button>
    </div>
  )
}

/** A page's size as the reader sees it, after its /Rotate. */
export function uprightSize(page: PDFPage) {
  const { width, height } = page.getSize()
  const angle = ((page.getRotation().angle % 360) + 360) % 360
  return angle === 90 || angle === 270 ? { width: height, height: width, angle } : { width, height, angle }
}

/**
 * Draws an embedded page upright inside a box whose bottom-left is (x, y), scaled by s.
 * w and h are the page's unrotated size. pdf-lib ignores /Rotate when embedding, so the turn is applied here.
 */
export function drawUpright(target: PDFPage, emb: PDFEmbeddedPage, x: number, y: number, s: number, angle: number, w: number, h: number) {
  const opts = { xScale: s, yScale: s }
  if (angle === 90) target.drawPage(emb, { ...opts, x, y: y + w * s, rotate: degrees(-90) })
  else if (angle === 180) target.drawPage(emb, { ...opts, x: x + w * s, y: y + h * s, rotate: degrees(180) })
  else if (angle === 270) target.drawPage(emb, { ...opts, x: x + h * s, y, rotate: degrees(90) })
  else target.drawPage(emb, { ...opts, x, y })
}
