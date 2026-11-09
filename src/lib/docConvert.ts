import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import { loadPdfDocument, renderPageToCanvas } from './pdfjs'
import { canvasToBlob } from '../components/ui'
import { toBlob } from './format'

type Progress = (label: string) => void

/**
 * Word to PDF: docx-preview lays the document out as real pages in the browser, each page is then
 * captured as an image. The result looks like the Word file, but its text is not selectable.
 */
export async function docxToPdf(file: File, onProgress: Progress): Promise<Blob> {
  onProgress('Membaca dokumen Word…')
  const [{ renderAsync }, { default: html2canvas }] = await Promise.all([import('docx-preview'), import('html2canvas-pro')])
  const host = document.createElement('div')
  // Off-screen but laid out: html2canvas needs real layout, so not display:none.
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:auto;background:#fff;'
  document.body.appendChild(host)
  try {
    await renderAsync(await file.arrayBuffer(), host, undefined, {
      inWrapper: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      experimental: true,
      useBase64URL: true,
    })
    const pages = Array.from(host.querySelectorAll<HTMLElement>('section.docx'))
    if (!pages.length) throw new Error('Dokumen kosong atau formatnya tidak dikenali')
    const pdf = await PDFDocument.create()
    for (const [i, page] of pages.entries()) {
      onProgress(`Merender halaman ${i + 1}/${pages.length}…`)
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', logging: false })
      const jpg = await pdf.embedJpg(await (await canvasToBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer())
      // CSS px (96 dpi) to PDF points (72 dpi).
      const w = (page.offsetWidth * 72) / 96
      const h = (page.offsetHeight * 72) / 96
      pdf.addPage([w, h]).drawImage(jpg, { x: 0, y: 0, width: w, height: h })
    }
    return toBlob(await pdf.save(), 'application/pdf')
  } finally {
    host.remove()
  }
}

type Line = { y: number; x: number; text: string; size: number }

/** Groups pdf.js text items into visual lines, top to bottom, left to right. */
function linesOf(items: { str: string; transform: number[]; height: number; width: number }[]): Line[] {
  const lines: Line[] = []
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])
  for (const it of sorted) {
    const y = it.transform[5]
    const size = Math.abs(it.transform[3]) || it.height || 11
    const line = lines.find((l) => Math.abs(l.y - y) < size * 0.5)
    if (line) {
      // Keep words apart when pdf.js splits them into separate items.
      line.text += (line.text.endsWith(' ') || it.str.startsWith(' ') ? '' : ' ') + it.str
      line.size = Math.max(line.size, size)
    } else lines.push({ y, x: it.transform[4], text: it.str, size })
  }
  return lines.sort((a, b) => b.y - a.y)
}

/**
 * PDF to Word.
 * - 'teks': editable paragraphs rebuilt from the text, layout simplified (works for normal, non-scanned PDFs).
 * - 'persis': each page placed as an image, looks identical but is not editable.
 */
export async function pdfToDocx(file: File, mode: 'teks' | 'persis', onProgress: Progress): Promise<{ blob: Blob; empty: boolean }> {
  const { Document, Packer, Paragraph, TextRun, ImageRun, PageBreak } = await import('docx')
  const doc = await loadPdfDocument(file)
  const children: InstanceType<typeof Paragraph>[] = []
  let anyText = false

  for (let p = 1; p <= doc.numPages; p++) {
    onProgress(`Membaca halaman ${p}/${doc.numPages}…`)
    const page = await doc.getPage(p)
    if (mode === 'persis') {
      const vp = page.getViewport({ scale: 1 })
      const canvas = await renderPageToCanvas(page, 2)
      const data = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', 0.9)).arrayBuffer())
      // Fit the 6.5 inch text width of a Word page.
      const w = 624
      children.push(new Paragraph({ children: [new ImageRun({ type: 'jpg', data, transformation: { width: w, height: Math.round((w * vp.height) / vp.width) } })] }))
    } else {
      const tc = await page.getTextContent()
      const lines = linesOf(tc.items.filter((i): i is (typeof tc.items)[number] & { str: string; transform: number[]; height: number; width: number } => 'str' in i))
      let para: string[] = []
      let size = 11
      const flush = () => {
        if (!para.length) return
        children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: para.join(' '), size: Math.round(Math.min(Math.max(size, 8), 28) * 2) })] }))
        para = []
      }
      lines.forEach((l, i) => {
        anyText = true
        const prev = lines[i - 1]
        // A gap clearly bigger than the line height, or a size change, starts a new paragraph.
        if (prev && (prev.y - l.y > l.size * 1.8 || Math.abs(prev.size - l.size) > 1.5)) flush()
        size = l.size
        para.push(l.text.trim())
      })
      flush()
    }
    if (p < doc.numPages) children.push(new Paragraph({ children: [new PageBreak()] }))
  }

  const docx = new Document({
    sections: [{ properties: mode === 'persis' ? { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } } : {}, children }],
  })
  return { blob: await Packer.toBlob(docx), empty: mode === 'teks' && !anyText }
}

function safeFor(font: PDFFont, text: string) {
  return [...text]
    .map((ch) => {
      try {
        font.encodeText(ch)
        return ch
      } catch {
        return '?'
      }
    })
    .join('')
}

/** Plain text to an A4 PDF with wrapped lines. Characters outside Latin-1 (emoji, CJK) become "?". */
export async function txtToPdf(text: string): Promise<Blob> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const size = 11
  const lead = size * 1.45
  const [W, H, M] = [595.28, 841.89, 56]
  let page = pdf.addPage([W, H])
  let y = H - M
  const newLine = () => {
    y -= lead
    if (y < M) {
      page = pdf.addPage([W, H])
      y = H - M - lead
    }
  }
  y += lead
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const words = safeFor(font, raw.replace(/\t/g, '    ')).split(' ')
    let line = ''
    newLine()
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(test, size) > W - 2 * M && line) {
        page.drawText(line, { x: M, y, size, font })
        newLine()
        line = w
      } else line = test
    }
    if (line) page.drawText(line, { x: M, y, size, font })
  }
  return toBlob(await pdf.save(), 'application/pdf')
}

export async function txtToDocx(text: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await import('docx')
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => new Paragraph({ children: [new TextRun({ text: l, size: 22 })] }))
  return Packer.toBlob(new Document({ sections: [{ children: paragraphs }] }))
}
