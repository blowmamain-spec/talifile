/*
 * Search-engine copy per page. Used twice: at build time to write a static HTML page per tool
 * (vite.config.ts, prerender plugin), and at runtime to keep the tab title and description in sync.
 * Titles use the words people actually type into Google; every claim must stay true to what the tool does.
 */
export type PageSeo = { title: string; description: string; intro: string; steps: string[] }

const free = 'Gratis, tanpa akun, file tidak diupload ke server.'

export const toolSeo: Record<string, PageSeo> = {
  konversi: {
    title: 'Konversi File Online: PDF ke Word, Gambar ke PDF, JPG ke PNG',
    description: `Ubah PDF ke Word, Word ke PDF, gambar ke PDF, PDF ke JPG, HEIC iPhone ke JPG, dan JPG, PNG, WebP. ${free}`,
    intro: 'Masukkan gambar, PDF, dokumen Word, atau file teks. TaliFile mengenali jenis filenya, lalu kamu pilih mau dijadikan format apa.',
    steps: ['Pilih atau drop file yang mau diubah.', 'Pilih format tujuan, misalnya PDF, Word, atau JPG.', 'Klik konversi, hasilnya langsung terunduh.'],
  },
  'remove-background': {
    title: 'Hapus Background Foto Online Gratis, Hasil PNG Transparan',
    description: `Hapus latar belakang foto otomatis dengan AI yang berjalan di browser. Hasilnya PNG transparan. ${free}`,
    intro: 'Latar belakang foto dihapus otomatis oleh model AI yang berjalan di perangkatmu sendiri. Cocok untuk foto produk, stiker, atau desain.',
    steps: ['Pilih kualitas model, lalu upload foto.', 'Tunggu proses selesai. Pertama kali, model AI diunduh dulu.', 'Download hasilnya sebagai PNG transparan.'],
  },
  'pas-foto': {
    title: 'Buat Pas Foto Online 2x3, 3x4, 4x6 Background Merah atau Biru',
    description: `Ubah foto biasa jadi pas foto 2x3, 3x4, atau 4x6 dengan latar merah, biru, atau putih, siap cetak 300 DPI dan lembar 4R. ${free}`,
    intro: 'Untuk syarat CPNS, lamaran kerja, ijazah, atau dokumen resmi. Latar asli dihapus otomatis lalu diganti warna pilihanmu.',
    steps: ['Upload foto wajah menghadap depan.', 'Pilih ukuran dan warna latar, geser dan perbesar sampai pas.', 'Download satu pas foto atau satu lembar 4R siap cetak.'],
  },
  compress: {
    title: 'Kompres Foto dan PDF Online, Bisa sampai di Bawah 200 KB',
    description: `Perkecil ukuran gambar dan PDF untuk syarat upload, misalnya maksimal 200 KB atau 1 MB. Banyak file sekaligus. ${free}`,
    intro: 'Untuk formulir yang membatasi ukuran file, seperti pendaftaran kampus, beasiswa, atau CPNS. Pilih kualitas, atau langsung tentukan target ukuran maksimal.',
    steps: ['Pilih gambar atau PDF, boleh banyak sekaligus.', 'Atur kualitas, atau pilih target ukuran seperti 200 KB.', 'Download satu per satu atau semua dalam satu ZIP.'],
  },
  'crop-resize': {
    title: 'Crop dan Resize Gambar Online, Potong Foto Sesuai Rasio',
    description: `Potong foto dari sisi dan sudut mana saja dengan grid, pilih rasio 1:1, 4:3, atau 16:9, lalu atur ukuran akhirnya. ${free}`,
    intro: 'Potong bagian yang perlu dengan kotak yang bisa ditarik dari keempat sisi dan sudut, lalu tentukan lebar hasil tanpa membuat gambar gepeng.',
    steps: ['Upload gambar.', 'Tarik kotak potong atau pilih rasio, lalu atur ukuran hasil.', 'Proses dan download sebagai JPG, PNG, atau WebP.'],
  },
  'resize-banyak': {
    title: 'Resize Banyak Gambar Sekaligus Online, Hasil ZIP',
    description: `Ubah ukuran puluhan foto sekaligus dengan aturan yang sama, berdasarkan sisi terpanjang atau persentase. ${free}`,
    intro: 'Satu aturan untuk semua foto: misalnya semua dibuat sisi terpanjang 1280 px, atau semua diperkecil 50%. Hasilnya satu file ZIP.',
    steps: ['Pilih semua gambar yang mau diubah.', 'Tentukan sisi terpanjang atau persentase dan format hasil.', 'Download semuanya dalam satu ZIP.'],
  },
  'putar-gambar': {
    title: 'Putar dan Balik Gambar Online (Rotate, Flip, Mirror)',
    description: `Putar foto 90 derajat ke kiri atau kanan, atau balik seperti cermin, misalnya selfie yang terbalik. ${free}`,
    intro: 'Untuk foto yang miring atau selfie yang terbalik. Putar per 90 derajat atau balik kiri-kanan dan atas-bawah.',
    steps: ['Upload gambar.', 'Putar atau balik sampai posisinya benar.', 'Download gambar yang sudah diperbaiki.'],
  },
  'sensor-gambar': {
    title: 'Sensor Foto KTP Online: Blur atau Tutup NIK dan Alamat',
    description: `Tutup NIK, alamat, wajah, atau nomor rekening di foto dengan kotak hitam, pixel, atau blur sebelum dikirim. ${free}`,
    intro: 'Sebelum mengirim foto KTP atau screenshot, tutup bagian yang tidak perlu terlihat. Kotak hitam paling aman untuk angka penting.',
    steps: ['Upload foto atau screenshot.', 'Tarik kotak di bagian yang mau ditutup, pilih kotak hitam, pixel, atau blur.', 'Download foto yang sudah disensor.'],
  },
  'watermark-gambar': {
    title: 'Watermark Foto KTP Online: "Hanya untuk Verifikasi"',
    description: `Tambahkan teks watermark berulang di foto KTP atau dokumen, misalnya "Hanya untuk verifikasi pinjaman X". ${free}`,
    intro: 'Tulis tujuan dan tanggal di salinan dokumen supaya tidak bisa dipakai ulang untuk keperluan lain.',
    steps: ['Upload foto dokumen.', 'Tulis teks watermark, atur ukuran dan transparansi.', 'Download foto yang sudah diberi watermark.'],
  },
  'hapus-metadata': {
    title: 'Hapus Metadata dan Lokasi GPS Foto Online (EXIF)',
    description: `Buang lokasi GPS, model kamera, dan waktu pengambilan dari foto sebelum dibagikan. JPG dan PNG tanpa mengurangi kualitas. ${free}`,
    intro: 'Foto dari HP sering menyimpan lokasi tempat foto diambil. TaliFile menunjukkan apa yang tersimpan, lalu menghapusnya.',
    steps: ['Pilih foto, boleh banyak.', 'Lihat metadata yang terdeteksi, misalnya lokasi GPS.', 'Klik hapus metadata dan download hasilnya.'],
  },
  collage: {
    title: 'Buat Kolase Foto Online, Grid 1:1, 4:5, 16:9',
    description: `Susun sampai 16 foto jadi satu gambar grid, atur jarak, sudut membulat, dan warna latar. ${free}`,
    intro: 'Gabungkan beberapa foto jadi satu gambar untuk dokumentasi kegiatan atau media sosial.',
    steps: ['Pilih beberapa foto dan atur urutannya.', 'Pilih rasio, jumlah kolom, jarak, dan latar.', 'Download kolase sebagai JPG atau PNG.'],
  },
  'merge-pdf': {
    title: 'Gabung PDF Online Gratis (Merge PDF)',
    description: `Gabungkan beberapa file PDF jadi satu dan atur urutannya dengan geser. ${free}`,
    intro: 'Satukan beberapa PDF, misalnya berkas lamaran atau laporan, jadi satu file dengan urutan yang kamu tentukan.',
    steps: ['Pilih semua PDF yang mau digabung.', 'Geser untuk mengatur urutan.', 'Klik gabungkan dan download PDF-nya.'],
  },
  'split-pdf': {
    title: 'Pisah PDF Online: Ambil Halaman Tertentu (Split PDF)',
    description: `Pisahkan halaman PDF atau ambil halaman tertentu saja jadi file baru. ${free}`,
    intro: 'Ambil hanya halaman yang kamu perlukan dari PDF yang tebal.',
    steps: ['Upload PDF.', 'Pilih halaman yang mau diambil atau dipisahkan.', 'Download hasilnya.'],
  },
  'organize-pdf': {
    title: 'Atur Halaman PDF Online: Hapus, Putar, Urutkan',
    description: `Hapus halaman, putar halaman yang miring, dan susun ulang urutan halaman PDF. ${free}`,
    intro: 'Rapikan PDF hasil scan: buang halaman kosong, putar yang terbalik, dan atur urutannya.',
    steps: ['Upload PDF.', 'Hapus, putar, atau geser halaman.', 'Simpan dan download PDF yang sudah rapi.'],
  },
  'sign-pdf': {
    title: 'Tanda Tangan PDF Online Gratis, Tanpa Print',
    description: `Gambar, ketik, atau upload tanda tangan, lalu tempel di PDF bersama tanggal. Bisa lebih dari satu per halaman. ${free}`,
    intro: 'Tanda tangani surat dan dokumen tanpa mencetak dan memindai ulang. Tanda tangan dan tanggal bisa digeser dan diubah ukurannya.',
    steps: ['Upload PDF dan siapkan tanda tangan.', 'Klik di halaman untuk menempel, geser sampai pas.', 'Download PDF yang sudah ditandatangani.'],
  },
  'tambah-teks-pdf': {
    title: 'Tulis di PDF Online: Tambah Teks ke PDF',
    description: `Klik di mana saja pada halaman PDF untuk menulis, cocok untuk mengisi formulir yang tidak punya kolom isian. ${free}`,
    intro: 'Untuk formulir PDF yang harus diisi tapi tidak bisa diketik langsung. Atur ukuran, warna, dan posisi teksnya.',
    steps: ['Upload PDF.', 'Klik di halaman, lalu ketik teksnya.', 'Download PDF yang sudah diisi.'],
  },
  'fill-pdf-form': {
    title: 'Isi Formulir PDF Online (PDF Form Filler)',
    description: `Isi kolom formulir PDF yang bisa diisi: teks, centang, pilihan, dan daftar. ${free}`,
    intro: 'Untuk PDF yang sudah punya kolom isian. Semua kolom ditampilkan sebagai formulir biasa yang tinggal diisi.',
    steps: ['Upload PDF formulir.', 'Isi semua kolom yang tampil.', 'Download PDF yang sudah terisi.'],
  },
  'sensor-pdf': {
    title: 'Sensor PDF Online: Hitamkan Teks Rahasia (Redact PDF)',
    description: `Hitamkan NIK, nomor rekening, atau bagian rahasia di PDF. Isinya benar-benar terhapus, bukan sekadar ditutupi. ${free}`,
    intro: 'Kotak hitam biasa masih menyisakan teks yang bisa disalin. Di sini halaman yang disensor dirender ulang, jadi teksnya benar-benar hilang.',
    steps: ['Upload PDF.', 'Tarik kotak di bagian yang mau dihitamkan.', 'Download PDF yang sudah disensor.'],
  },
  'watermark-pdf': {
    title: 'Watermark PDF Online: Tambah Teks di Semua Halaman',
    description: `Tambahkan watermark teks seperti DRAFT, RAHASIA, atau COPY ke semua halaman PDF dengan pratinjau. ${free}`,
    intro: 'Tandai dokumen sebagai draft atau salinan dengan teks miring di tengah setiap halaman.',
    steps: ['Upload PDF.', 'Tulis teks watermark, atur ukuran, transparansi, dan rotasi.', 'Download PDF yang sudah diberi watermark.'],
  },
  'page-numbers': {
    title: 'Tambah Nomor Halaman PDF Online',
    description: `Beri nomor halaman otomatis di PDF: pilih posisi, format seperti "Halaman 1 dari 10", dan lewati halaman cover. ${free}`,
    intro: 'Untuk laporan, skripsi, atau tugas yang wajib bernomor halaman.',
    steps: ['Upload PDF.', 'Pilih posisi, format, dan nomor awal.', 'Download PDF yang sudah bernomor.'],
  },
  'protect-pdf': {
    title: 'Kunci PDF dengan Password Online, atau Buka Password PDF',
    description: `Pasang password ke PDF dengan enkripsi AES-256, atau lepas password PDF milikmu yang password-nya kamu tahu. ${free}`,
    intro: 'Lindungi dokumen sebelum dikirim. Kamu juga bisa mengatur apakah orang lain boleh mencetak atau menyalin teksnya.',
    steps: ['Pilih kunci atau buka kunci, lalu upload PDF.', 'Tulis password.', 'Download PDF hasilnya.'],
  },
  'ocr-pdf': {
    title: 'OCR PDF Online: Ambil Teks dari PDF Hasil Scan',
    description: `Baca teks dari PDF hasil scan, bahasa Indonesia dan Inggris, lalu salin atau simpan sebagai .txt. ${free}`,
    intro: 'Untuk PDF yang isinya gambar hasil scan, sehingga teksnya tidak bisa diblok dan disalin.',
    steps: ['Upload PDF hasil scan.', 'Pilih bahasa dokumen dan mulai OCR.', 'Salin teksnya atau download sebagai .txt.'],
  },
  'ukuran-halaman': {
    title: 'Ubah Ukuran Halaman PDF ke A4, F4, Letter Online',
    description: `Seragamkan semua halaman PDF ke A4, F4 (folio), Letter, atau Legal tanpa membuat isinya gepeng. ${free}`,
    intro: 'Untuk PDF gabungan dengan ukuran halaman yang campur aduk, supaya rapi saat dicetak.',
    steps: ['Upload PDF.', 'Pilih ukuran kertas, orientasi, dan margin.', 'Download PDF dengan ukuran halaman seragam.'],
  },
  'n-up': {
    title: 'Cetak 2 atau 4 Halaman PDF per Lembar (N-up) Online',
    description: `Susun 2 atau 4 halaman PDF dalam satu lembar A4 supaya hemat kertas saat dicetak, misalnya slide kuliah. ${free}`,
    intro: 'Hemat kertas saat mencetak slide atau materi panjang.',
    steps: ['Upload PDF.', 'Pilih 2 atau 4 halaman per lembar.', 'Download PDF yang siap dicetak.'],
  },
  'crop-pdf': {
    title: 'Crop PDF Online: Potong Margin Halaman',
    description: `Potong margin putih yang terlalu lebar di semua halaman PDF, dengan deteksi margin otomatis. ${free}`,
    intro: 'Buang margin kosong supaya isi PDF lebih besar saat dibaca di HP atau dicetak.',
    steps: ['Upload PDF.', 'Tarik kotak potong atau pakai deteksi otomatis.', 'Download PDF yang sudah dipotong.'],
  },
  'info-pdf': {
    title: 'Edit Metadata PDF Online: Judul, Penulis, Kata Kunci',
    description: `Ubah atau kosongkan judul, penulis, subjek, dan kata kunci yang tersimpan di properti file PDF. ${free}`,
    intro: 'Rapikan info yang muncul di properti file, atau kosongkan semuanya sebelum dokumen dibagikan.',
    steps: ['Upload PDF.', 'Ubah atau kosongkan kolom info.', 'Simpan dan download PDF-nya.'],
  },
  'qr-code': {
    title: 'Buat QR Code Online Gratis: Link, Teks, WiFi, dengan Logo',
    description: `Buat QR code untuk link, teks, atau WiFi, bisa diberi logo, download PNG atau SVG. Bisa juga membaca QR dari gambar. ${free}`,
    intro: 'Buat QR untuk link pendaftaran, menu, atau password WiFi. Atau baca isi QR dari screenshot.',
    steps: ['Pilih isi QR: link, teks, atau WiFi.', 'Atur warna dan tambahkan logo kalau perlu.', 'Download sebagai PNG atau SVG.'],
  },
}

export const pageSeo: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'TaliFile: Kompres, Konversi, dan Olah PDF & Foto Online Gratis',
    description:
      'Kompres foto dan PDF, PDF ke Word, pas foto, hapus background, tanda tangan PDF, gabung PDF, dan lainnya. Gratis, tanpa akun, file tidak diupload ke server.',
  },
  '/tentang': {
    title: 'Tentang TaliFile',
    description: 'TaliFile adalah kumpulan alat untuk gambar, PDF, dan dokumen Word yang berjalan sepenuhnya di browser. File tidak diupload ke server.',
  },
  '/privasi': {
    title: 'Privasi · TaliFile',
    description: 'Bagaimana TaliFile memperlakukan file dan data kamu: semua proses di browser, tidak ada upload ke server.',
  },
}
