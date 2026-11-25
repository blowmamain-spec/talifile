export type Category = 'gambar' | 'pdf' | 'lainnya'

export type Tool = {
  id: string
  path: string
  title: string
  description: string
  category: Category
  /** Extra search terms, including the everyday words people type ("ttd", "kecilin"). */
  keywords: string
  /** File types the tool takes, used to offer "continue in another tool" and share-to-app. Empty: takes no file. */
  accepts: string
}

const IMG = 'image/png,image/jpeg,image/webp'
const PDF = 'application/pdf'

export const tools: Tool[] = [
  // One entry point for every format change: detects the file type and offers the targets.
  { id: 'konversi', path: '/konversi', title: 'Konversi File', description: 'Gambar, PDF, Word, atau teks: pilih mau dijadikan format apa.', category: 'lainnya', keywords: 'convert konversi ubah format jpg png webp heic iphone pdf word docx doc txt gambar jadi pdf pdf jadi word pdf jadi gambar', accepts: 'image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain' },

  // Gambar
  { id: 'remove-background', path: '/remove-background', title: 'Remove Background', description: 'Hapus background gambar otomatis, hasil PNG transparan.', category: 'gambar', keywords: 'hapus latar transparan png foto produk', accepts: IMG },
  { id: 'pas-foto', path: '/pas-foto', title: 'Pas Foto', description: 'Ukuran 2x3, 3x4, 4x6 dengan latar merah, biru, atau putih.', category: 'gambar', keywords: 'pasfoto ktp cpns ijazah lamaran background merah biru cetak', accepts: IMG },
  { id: 'pasang-twibbon', path: '/pasang-twibbon', title: 'Pasang Twibbon', description: 'Pasang satu atau beberapa foto ke dalam frame twibbon.', category: 'gambar', keywords: 'twibbon twibon frame bingkai foto event kampanye panitia overlay', accepts: IMG },
  { id: 'compress', path: '/compress', title: 'Compress File', description: 'Perkecil gambar atau PDF, bisa sampai target ukuran.', category: 'gambar', keywords: 'kompres kecilin perkecil ukuran kb mb upload', accepts: `${IMG},${PDF}` },
  { id: 'crop-resize', path: '/crop-resize', title: 'Crop & Resize', description: 'Potong dan ubah ukuran gambar langsung di browser.', category: 'gambar', keywords: 'potong ubah ukuran dimensi pixel', accepts: IMG },
  { id: 'resize-banyak', path: '/resize-banyak', title: 'Resize Banyak Gambar', description: 'Ubah ukuran banyak gambar sekaligus, hasil satu .zip.', category: 'gambar', keywords: 'batch massal sekaligus resize zip', accepts: IMG },
  { id: 'putar-gambar', path: '/putar-gambar', title: 'Putar & Balik', description: 'Putar 90 derajat atau balik gambar seperti cermin.', category: 'gambar', keywords: 'rotate flip mirror cermin miring', accepts: IMG },
  { id: 'sensor-gambar', path: '/sensor-gambar', title: 'Sensor Gambar', description: 'Tutup NIK, alamat, atau wajah dengan blur atau kotak hitam.', category: 'gambar', keywords: 'blur sensor ktp nik privasi sembunyikan pixel', accepts: IMG },
  { id: 'watermark-gambar', path: '/watermark-gambar', title: 'Watermark Gambar', description: 'Tambahkan teks seperti "Hanya untuk verifikasi" ke foto.', category: 'gambar', keywords: 'watermark ktp verifikasi tanda air teks foto', accepts: IMG },
  { id: 'hapus-metadata', path: '/hapus-metadata', title: 'Hapus Metadata', description: 'Buang lokasi GPS dan info kamera sebelum foto dibagikan.', category: 'gambar', keywords: 'exif gps lokasi privasi metadata kamera', accepts: 'image/jpeg,image/png,image/webp' },
  { id: 'collage', path: '/collage', title: 'Kolase Gambar', description: 'Susun beberapa foto jadi satu gambar grid.', category: 'gambar', keywords: 'kolase grid gabung foto', accepts: IMG },

  // PDF
  { id: 'merge-pdf', path: '/merge-pdf', title: 'Merge PDF', description: 'Gabungkan beberapa PDF jadi satu, urutan bisa diatur.', category: 'pdf', keywords: 'gabung satukan pdf', accepts: PDF },
  { id: 'split-pdf', path: '/split-pdf', title: 'Split PDF', description: 'Pisahkan halaman PDF atau ambil halaman tertentu.', category: 'pdf', keywords: 'pisah ambil halaman potong', accepts: PDF },
  { id: 'organize-pdf', path: '/organize-pdf', title: 'Organize PDF', description: 'Hapus, putar, atau atur ulang urutan halaman.', category: 'pdf', keywords: 'urutkan putar hapus halaman rotate', accepts: PDF },
  { id: 'sign-pdf', path: '/sign-pdf', title: 'Sign PDF', description: 'Tanda tangan dan tanggal di PDF, tanpa print.', category: 'pdf', keywords: 'ttd tanda tangan signature tanggal', accepts: PDF },
  { id: 'tambah-teks-pdf', path: '/tambah-teks-pdf', title: 'Tulis di PDF', description: 'Tambahkan teks bebas di mana saja pada halaman PDF.', category: 'pdf', keywords: 'edit teks isi formulir ketik tulis catatan', accepts: PDF },
  { id: 'fill-pdf-form', path: '/fill-pdf-form', title: 'Isi Form PDF', description: 'Isi field formulir PDF yang bisa diisi.', category: 'pdf', keywords: 'formulir field acroform isi', accepts: PDF },
  { id: 'sensor-pdf', path: '/sensor-pdf', title: 'Sensor PDF', description: 'Hitamkan bagian rahasia, isinya benar-benar terhapus.', category: 'pdf', keywords: 'redact sensor hitamkan rahasia privasi', accepts: PDF },
  { id: 'watermark-pdf', path: '/watermark-pdf', title: 'Watermark PDF', description: 'Tambahkan teks watermark ke semua halaman.', category: 'pdf', keywords: 'tanda air draft rahasia', accepts: PDF },
  { id: 'page-numbers', path: '/page-numbers', title: 'Nomor Halaman', description: 'Tambahkan nomor halaman otomatis ke PDF.', category: 'pdf', keywords: 'nomor halaman page number', accepts: PDF },
  { id: 'protect-pdf', path: '/protect-pdf', title: 'Kunci PDF', description: 'Pasang password ke PDF, atau lepas password PDF milikmu.', category: 'pdf', keywords: 'password kunci enkripsi buka unlock', accepts: PDF },
  { id: 'ocr-pdf', path: '/ocr-pdf', title: 'OCR PDF', description: 'Ambil teks dari PDF hasil scan.', category: 'pdf', keywords: 'scan baca teks ocr', accepts: PDF },
  { id: 'ukuran-halaman', path: '/ukuran-halaman', title: 'Ubah Ukuran Halaman', description: 'Seragamkan semua halaman ke A4, F4, atau Letter.', category: 'pdf', keywords: 'a4 f4 folio letter ukuran kertas', accepts: PDF },
  { id: 'n-up', path: '/n-up', title: 'Beberapa Halaman per Lembar', description: 'Cetak 2 atau 4 halaman di satu lembar, hemat kertas.', category: 'pdf', keywords: 'nup print hemat kertas 2 4 halaman', accepts: PDF },
  { id: 'crop-pdf', path: '/crop-pdf', title: 'Crop PDF', description: 'Potong margin putih di semua halaman.', category: 'pdf', keywords: 'potong margin pinggir', accepts: PDF },
  { id: 'info-pdf', path: '/info-pdf', title: 'Edit Info PDF', description: 'Ubah judul, penulis, dan kata kunci file PDF.', category: 'pdf', keywords: 'metadata judul penulis properti', accepts: PDF },

  // Lainnya
  { id: 'qr-code', path: '/qr-code', title: 'QR Code', description: 'Buat QR untuk link, teks, atau WiFi. Bisa juga membaca QR.', category: 'lainnya', keywords: 'qr barcode wifi link scan baca', accepts: '' },
]

export const categoryLabels: Record<Category, string> = {
  gambar: 'Gambar',
  pdf: 'PDF',
  lainnya: 'Lainnya',
}

/** True when a file of this MIME type can be handed to the tool. */
export function toolAccepts(tool: Tool, mime: string) {
  if (!tool.accepts) return false
  return tool.accepts.split(',').some((a) => a === mime || (a.endsWith('/*') && mime.startsWith(a.slice(0, -1))))
}

export function toolById(id: string) {
  return tools.find((t) => t.id === id)
}
