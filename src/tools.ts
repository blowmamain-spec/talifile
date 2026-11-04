export type Tool = {
  id: string
  path: string
  title: string
  description: string
}

export const tools: Tool[] = [
  {
    id: 'remove-background',
    path: '/remove-background',
    title: 'Remove Background',
    description: 'Hapus background gambar otomatis, hasil PNG transparan.',
  },
  {
    id: 'compress',
    path: '/compress',
    title: 'Compress File',
    description: 'Perkecil ukuran gambar atau PDF tanpa ribet.',
  },
  {
    id: 'crop-resize',
    path: '/crop-resize',
    title: 'Crop & Resize',
    description: 'Potong dan ubah ukuran gambar langsung di browser.',
  },
  {
    id: 'image-to-pdf',
    path: '/image-to-pdf',
    title: 'Image to PDF',
    description: 'Gabungkan beberapa gambar jadi satu file PDF.',
  },
  {
    id: 'pdf-to-image',
    path: '/pdf-to-image',
    title: 'PDF to Image',
    description: 'Ekspor setiap halaman PDF jadi gambar JPG.',
  },
  {
    id: 'merge-pdf',
    path: '/merge-pdf',
    title: 'Merge PDF',
    description: 'Gabungkan beberapa file PDF jadi satu, urutan bisa diatur.',
  },
  {
    id: 'organize-pdf',
    path: '/organize-pdf',
    title: 'Organize PDF',
    description: 'Hapus, putar, atau atur ulang urutan halaman PDF.',
  },
  {
    id: 'watermark-pdf',
    path: '/watermark-pdf',
    title: 'Watermark PDF',
    description: 'Tambahkan teks watermark ke semua halaman PDF.',
  },
  {
    id: 'sign-pdf',
    path: '/sign-pdf',
    title: 'Sign PDF',
    description: 'Tanda tangani PDF langsung di browser, tanpa print.',
  },
  {
    id: 'split-pdf',
    path: '/split-pdf',
    title: 'Split PDF',
    description: 'Pisahkan halaman PDF atau ambil halaman tertentu.',
  },
]
