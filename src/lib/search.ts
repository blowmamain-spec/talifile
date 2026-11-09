import type { Tool } from '../tools'

/*
 * Concept search. Every word the user types is mapped to a concept ("kecilin", "compress", "kompres" -> compress),
 * in Indonesian, English, and everyday slang, with typo tolerance and prefix matching for the word being typed.
 * Tools are ranked by how many of the query's concepts they cover, then by how central each concept is to the tool.
 */

type Concept =
  | 'img' | 'pdf' | 'word' | 'text' | 'convert' | 'compress' | 'merge' | 'split' | 'organize' | 'rotate' | 'crop'
  | 'resize' | 'removebg' | 'sign' | 'date' | 'watermark' | 'pagenum' | 'lock' | 'ocr' | 'redact' | 'metadata' | 'qr'
  | 'collage' | 'pasfoto' | 'form' | 'write' | 'info' | 'pagesize' | 'nup' | 'batch' | 'heic' | 'page' | 'jpg' | 'png'
  | 'webp' | 'read' | 'id' | 'print' | 'verb'

// Phrases first (matched on the joined query), then single words. Order inside a list does not matter.
const vocab: Record<Concept, string[]> = {
  img: ['gambar', 'image', 'images', 'img', 'foto', 'photo', 'photos', 'picture', 'pic', 'pict', 'gmbr', 'poto', 'gambarnya', 'fotonya'],
  jpg: ['jpg', 'jpeg'],
  png: ['png'],
  webp: ['webp'],
  heic: ['heic', 'heif', 'iphone', 'ios', 'apple'],
  pdf: ['pdf', 'pdfnya'],
  word: ['word', 'doc', 'docx', 'dokumen', 'document', 'documents', 'msword', 'office'],
  text: ['teks', 'text', 'txt', 'tulisan', 'plaintext'],
  convert: ['convert', 'konversi', 'konvert', 'converter', 'konverter', 'ubah format', 'ganti format', 'format', 'to', 'ke', 'jadi', 'jadikan', 'into', 'menjadi', 'ubah'],
  compress: ['compress', 'kompres', 'compres', 'kompress', 'kecil', 'kecilin', 'perkecil', 'kecilkan', 'mengecilkan', 'shrink', 'reduce', 'optimize', 'optimasi', 'kb', 'mb', 'ukuran file', 'file size', 'size', 'ringan', 'enteng', 'upload', 'batas ukuran'],
  merge: ['merge', 'gabung', 'gabungkan', 'menggabungkan', 'satukan', 'combine', 'join', 'jadikan satu', 'satu file'],
  split: ['split', 'pisah', 'pisahkan', 'memisahkan', 'extract', 'ekstrak', 'ambil halaman', 'pecah', 'bagi'],
  organize: ['organize', 'atur', 'urutkan', 'urut', 'urutan', 'reorder', 'susun', 'hapus halaman', 'delete page', 'remove page', 'pindah halaman'],
  rotate: ['rotate', 'putar', 'memutar', 'balik', 'flip', 'mirror', 'cermin', 'miring', 'terbalik', 'orientasi'],
  crop: ['crop', 'potong', 'memotong', 'pangkas', 'trim', 'cut', 'margin', 'pinggir'],
  resize: ['resize', 'ubah ukuran', 'ukuran', 'dimensi', 'dimension', 'pixel', 'piksel', 'px', 'perbesar', 'lebar', 'tinggi', 'scale'],
  removebg: ['background', 'bg', 'latar', 'latar belakang', 'hapus background', 'hapus latar', 'remove background', 'removebg', 'transparan', 'transparent', 'nobg', 'no bg', 'cutout'],
  sign: ['sign', 'signature', 'ttd', 'tanda tangan', 'tandatangan', 'paraf', 'esign', 'e-sign', 'tanda'],
  date: ['tanggal', 'date', 'stempel tanggal'],
  watermark: ['watermark', 'tanda air', 'wm', 'cap', 'verifikasi'],
  pagenum: ['nomor halaman', 'page number', 'page numbers', 'numbering', 'penomoran', 'nomor', 'number'],
  lock: ['password', 'kunci', 'lock', 'protect', 'proteksi', 'enkripsi', 'encrypt', 'sandi', 'kata sandi', 'unlock', 'buka kunci', 'decrypt', 'pw', 'aman', 'secure'],
  ocr: ['ocr', 'scan', 'scanned', 'hasil scan', 'pindai', 'kenali teks', 'recognize'],
  read: ['baca', 'read', 'ambil teks', 'salin teks', 'copy teks', 'copy text', 'extract text'],
  redact: ['sensor', 'blur', 'redact', 'redaksi', 'sembunyikan', 'hide', 'tutup', 'pixelate', 'samarkan', 'hitamkan', 'coret', 'privasi', 'privacy', 'wajah', 'muka', 'face', 'rahasia', 'confidential'],
  metadata: ['metadata', 'exif', 'gps', 'lokasi', 'location', 'info kamera'],
  qr: ['qr', 'qrcode', 'qr code', 'barcode', 'kode qr', 'wifi', 'scan qr'],
  collage: ['kolase', 'collage', 'grid', 'gabung foto', 'susun foto'],
  pasfoto: ['pas foto', 'pasfoto', 'passport', 'paspor', 'foto formal', 'foto ktp', '3x4', '4x6', '2x3', 'cpns', 'ijazah', 'lamaran', 'background merah', 'background biru'],
  id: ['ktp', 'kk', 'sim', 'npwp', 'identitas', 'nik'],
  form: ['form', 'formulir', 'isian', 'fill', 'isi form', 'acroform', 'kolom isian', 'isi'],
  write: ['tulis', 'menulis', 'ketik', 'tambah teks', 'add text', 'edit pdf', 'edit teks', 'catatan', 'annotate', 'anotasi'],
  info: ['judul', 'title', 'author', 'penulis', 'properti', 'properties', 'info pdf', 'metadata pdf'],
  pagesize: ['a4', 'f4', 'folio', 'letter', 'legal', 'ukuran kertas', 'paper size', 'kertas'],
  nup: ['hemat kertas', 'n-up', 'nup', 'per lembar', '2 halaman', '4 halaman', 'beberapa halaman', 'slide'],
  print: ['print', 'cetak', 'printer'],
  batch: ['banyak', 'massal', 'batch', 'sekaligus', 'bulk', 'semua', 'zip'],
  page: ['halaman', 'page', 'pages', 'lembar'],
  // Generic verbs: understood (so typos like "hapsu" resolve) but they never decide the tool on their own.
  verb: ['hapus', 'remove', 'delete', 'buang', 'add', 'tambah', 'tambahkan', 'make', 'create', 'edit', 'ganti', 'change', 'set', 'pasang'],
}

// How central each concept is to a tool: 3 = what it is for, 1 = it also handles this.
const toolConcepts: Record<string, Partial<Record<Concept, number>>> = {
  konversi: { convert: 3, img: 1, jpg: 2, png: 2, webp: 2, heic: 3, pdf: 1, word: 3, text: 2, read: 1 },
  'remove-background': { removebg: 3, img: 2, png: 1 },
  'pas-foto': { pasfoto: 3, removebg: 1, img: 1, print: 1, id: 1 },
  compress: { compress: 3, img: 1, pdf: 1, jpg: 1, batch: 1 },
  'crop-resize': { crop: 3, resize: 3, img: 2 },
  'resize-banyak': { resize: 3, batch: 3, img: 2 },
  'putar-gambar': { rotate: 3, img: 2 },
  'sensor-gambar': { redact: 3, img: 2, id: 2 },
  'watermark-gambar': { watermark: 3, img: 2, id: 2 },
  'hapus-metadata': { metadata: 3, img: 1, redact: 1 },
  collage: { collage: 3, img: 2, merge: 1 },
  'merge-pdf': { merge: 3, pdf: 2 },
  'split-pdf': { split: 3, pdf: 2, page: 1 },
  'organize-pdf': { organize: 3, pdf: 2, page: 2, rotate: 1 },
  'sign-pdf': { sign: 3, date: 2, pdf: 2 },
  'tambah-teks-pdf': { write: 3, pdf: 2, form: 1, text: 1 },
  'fill-pdf-form': { form: 3, pdf: 2, write: 1 },
  'sensor-pdf': { redact: 3, pdf: 2, id: 1 },
  'watermark-pdf': { watermark: 3, pdf: 2 },
  'page-numbers': { pagenum: 3, pdf: 2, page: 2 },
  'protect-pdf': { lock: 3, pdf: 2 },
  'ocr-pdf': { ocr: 3, read: 2, text: 2, pdf: 1 },
  'ukuran-halaman': { pagesize: 3, resize: 1, pdf: 2, page: 1, print: 1 },
  'n-up': { nup: 3, print: 2, pdf: 2, page: 1 },
  'crop-pdf': { crop: 3, pdf: 2 },
  'info-pdf': { info: 3, pdf: 2, metadata: 1 },
  'qr-code': { qr: 3 },
}

// Words that carry no meaning on their own ("saya mau ...").
const stop = new Set(['dan', 'atau', 'yang', 'di', 'dari', 'untuk', 'buat', 'bikin', 'cara', 'how', 'the', 'a', 'an', 'my', 'saya', 'aku', 'gue', 'gw', 'mau', 'ingin', 'pengen', 'pingin', 'tolong', 'bisa', 'online', 'gratis', 'free', 'tool', 'tools', 'file', 'files', 'apk', 'aplikasi', 'app', 'with', 'pakai', 'dengan', 'in', 'of', 'on', 'for', 'and', 'or', 'ini', 'itu', 'nya'])

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/->|→|=>/g, ' to ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Optimal string alignment distance, capped: cheap enough to run per keystroke over a few hundred words. */
function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      rowMin = Math.min(rowMin, d[i][j])
    }
    if (rowMin > max) return max + 1
  }
  return d[a.length][b.length]
}

const singles: [string, Concept][] = []
const phrases: [string, Concept][] = []
for (const [concept, words] of Object.entries(vocab) as [Concept, string[]][]) {
  for (const w of words) (w.includes(' ') ? phrases : singles).push([w, concept])
}
phrases.sort((a, b) => b[0].length - a[0].length)

const CONVERT_ONLY = new Set(['to', 'ke', 'jadi', 'jadikan', 'into', 'menjadi'])
const FORMATS = new Set<Concept>(['img', 'pdf', 'word', 'text', 'jpg', 'png', 'webp', 'heic'])
// Concepts that do not name a job of their own, so they never cancel a format conversion.
const NEUTRAL = new Set<Concept>(['convert', 'page', 'batch', 'read', 'verb'])

type Parsed = { concepts: Set<Concept>; loose: string[]; convertIntent: boolean; formatCount: number }

/** Turns the query into concepts. `typing` marks the last word as possibly unfinished (prefix match). */
export function parse(query: string, typing = true): Parsed {
  let q = ` ${normalize(query)} `
  const concepts = new Set<Concept>()
  for (const [p, c] of phrases) {
    if (q.includes(` ${p} `)) {
      concepts.add(c)
      q = q.replace(` ${p} `, ' ')
    }
  }
  // "200kb", "1 mb": a size limit means compressing.
  if (/\b\d+(\.\d+)?\s?(kb|mb)\b/.test(q)) {
    concepts.add('compress')
    q = q.replace(/\b\d+(\.\d+)?\s?(kb|mb)\b/g, " ")
  }
  const words = q.trim().split(' ').filter(Boolean)
  const loose: string[] = []
  let convertIntent = words.some((w) => CONVERT_ONLY.has(w))
  words.forEach((w, i) => {
    if (stop.has(w)) return
    const exact = singles.filter(([s]) => s === w)
    if (exact.length) {
      exact.forEach(([, c]) => concepts.add(c))
      return
    }
    const last = typing && i === words.length - 1
    // Unfinished last word: "komp" -> compress, "tand" -> sign/watermark.
    if (last && w.length >= 2) {
      const pre = singles.filter(([s]) => s.startsWith(w))
      if (pre.length) {
        pre.forEach(([, c]) => concepts.add(c))
        return
      }
    }
    // Typos: one edit for short and normal words, two for long ones. Three-letter words ("fto") are only
    // compared with words of four letters or more, so "pdf" never turns into "png".
    if (w.length >= 3) {
      const max = w.length >= 7 ? 2 : 1
      let best: Concept | null = null
      let bestD = max + 1
      for (const [s, c] of singles) {
        if (s.length < (w.length === 3 ? 4 : 3)) continue
        const dd = editDistance(w, s, max)
        if (dd < bestD) {
          bestD = dd
          best = c
        }
      }
      if (best) {
        concepts.add(best)
        return
      }
    }
    loose.push(w)
  })
  if (concepts.has('convert')) convertIntent = true
  // "to/ke/jadi" only means a format conversion next to a format; "ubah ukuran ke a4" is not one (see searchTools).
  const formatCount = [...concepts].filter((c) => FORMATS.has(c)).length
  return { concepts, loose, convertIntent, formatCount }
}

export type Hit = { tool: Tool; score: number; coverage: number }

/**
 * Ranks tools for a query. Returns only the best-covering group (so "gambar ke pdf" does not list every tool
 * that merely mentions images), plus `partial` when no tool covers every word the user typed.
 */
export function searchTools(tools: Tool[], query: string): { hits: Hit[]; partial: boolean; understood: boolean } {
  const p = parse(query)
  const wanted = new Set(p.concepts)
  // A format conversion is formats plus "to/ke/jadi/convert" and nothing else: "kompres foto ke 200kb" is a
  // compress job and "scan pdf jadi teks" an OCR job, even though both contain "ke"/"jadi" and a format.
  const actions = [...wanted].filter((c) => !FORMATS.has(c) && !NEUTRAL.has(c))
  const conversion = p.convertIntent && p.formatCount >= 1 && actions.length === 0
  const onlyConvert = wanted.size === 1 && wanted.has('convert')
  if (!conversion && !onlyConvert) wanted.delete('convert')
  wanted.delete('verb')

  const scored: Hit[] = tools.map((tool) => {
    const weights = toolConcepts[tool.id] ?? {}
    let score = 0
    let coverage = 0
    for (const c of wanted) {
      const w = weights[c]
      if (w) {
        coverage++
        score += w * 10
      }
    }
    if (conversion && tool.id === 'konversi') {
      coverage = Math.max(coverage, wanted.size)
      score += 100
    }
    // Words we have no concept for still count when they appear in the tool's own text.
    const hay = normalize(`${tool.title} ${tool.description} ${tool.keywords}`)
    for (const w of p.loose) {
      if (w.length >= 3 && hay.includes(w)) {
        coverage++
        score += 4
      }
    }
    return { tool, score, coverage }
  })

  const needed = wanted.size + p.loose.length
  const best = Math.max(0, ...scored.map((s) => s.coverage))
  const hits = scored
    .filter((s) => s.coverage > 0 && s.coverage === best)
    .sort((a, b) => b.score - a.score)
  return { hits, partial: best > 0 && best < needed, understood: wanted.size > 0 || hits.length > 0 }
}
