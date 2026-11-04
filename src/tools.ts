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
    id: 'image-to-pdf',
    path: '/image-to-pdf',
    title: 'Image to PDF',
    description: 'Gabungkan beberapa gambar jadi satu file PDF.',
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
