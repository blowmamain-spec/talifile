# TaliFile

Kumpulan 28 alat untuk mengolah gambar, PDF, dan dokumen Word langsung di browser. Semua pemrosesan berjalan 100% di perangkat pengguna tanpa upload file ke server, tanpa akun, dan tetap bisa dipakai offline sebagai PWA.

URL produksi: [talifile.nfab.my.id](https://talifile.nfab.my.id)

## Fitur Utama
- **Gambar**: Remove Background (AI lokal + kuas hapus/kembalikan + zoom + ganti latar), Pas Foto (2x3, 3x4, 4x6, lembar cetak 4R), Pasang Twibbon (multi-foto, frame otomatis semi-transparan, layer, teks opsional), Compress File, Crop & Resize, Resize Banyak (ZIP), Putar & Balik, Sensor Gambar, Watermark Gambar, Hapus Metadata EXIF/GPS, Kolase.
- **PDF**: Merge, Split, Organize, Sign PDF, Tulis di PDF, Isi Form PDF, Sensor PDF (redact permanen), Watermark PDF, Nomor Halaman, Kunci/Buka PDF (AES-256), OCR PDF, Ubah Ukuran Halaman (A4/F4/Letter/Legal), N-Up (2 atau 4 halaman per lembar), Crop PDF, Edit Info PDF.
- **Lainnya**: Konversi File terpadu (JPG/PNG/WebP/HEIC, PDF, Word `.docx`, Teks `.txt`) dan QR Code (buat dengan logo/SVG & scan gambar).
- **Navigasi & Estafet File**: Pencarian sinonim dan toleransi typo (`/` di beranda atau `Ctrl+K` dari halaman mana saja), ganti nama file hasil, serta tombol lanjut ke tool lain tanpa upload ulang.

## Tech Stack
- React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS v4
- PWA (`vite-plugin-pwa`) lengkap dengan Android `share_target` (`/share`)
- SEO prerender statis per halaman tool + generator `sitemap.xml` di `vite.config.ts`
- Header keamanan & CSP ketat di `vercel.json` (disimulasikan juga saat `vite preview`)

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Perintah verifikasi dan build produksi:

```bash
npm run lint     # Cek aturan oxlint
npm run check    # Verifikasi sinkronisasi tool, ikon, route, SEO, dan mesin search
npm run build    # Typecheck (tsc -b), bundle Vite, prerender HTML, dan PWA precache
npm run preview  # Pratinjau build lokal lengkap dengan header CSP dari vercel.json
```

*(Di Windows PowerShell dengan Execution Policy terbatas, gunakan `npm.cmd` / `npx.cmd`.)*

## Deploy ke Vercel

```bash
npx vercel login
npx vercel --prod
```

### Opsional: Self-Host Model AI Remove Background (Cloudflare R2)
Secara bawaan, model AI Remove Background diunduh sekali dari `staticimgly.com` lalu disimpan di Cache Storage (`bg-model-v2`). Jika ingin meng-host sendiri aset model di bucket Cloudflare R2 agar unduhan pertama lebih cepat di Indonesia:
1. Upload isi folder distribusi `@imgly/background-removal-data` ke bucket publik R2 (aktifkan CORS `GET` untuk origin TaliFile dan header `Cache-Control: public, max-age=31536000, immutable`).
2. Tambahkan environment variable di Vercel:
   ```text
   VITE_BG_MODEL_PUBLIC_PATH=https://cdn.domain-kamu.id/bg-model/
   ```
3. Tambahkan origin bucket tersebut ke `connect-src` di `vercel.json` (baik pada CSP halaman maupun CSP `bgRemoval.worker`).
