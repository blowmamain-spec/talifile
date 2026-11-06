import { Link } from 'react-router-dom'
import Rope from '../components/Rope'
import { tools } from '../tools'

export default function Tentang() {
  return (
    <article className="max-w-2xl pt-4 sm:pt-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tentang TaliFile</h1>
      <Rope className="mt-3 h-3 w-40" />

      <div className="mt-8 space-y-5 leading-relaxed">
        <p>
          TaliFile adalah kumpulan {tools.length} alat kecil untuk urusan file sehari-hari: mengecilkan foto untuk syarat upload,
          membuat pas foto, menandatangani PDF, menyensor KTP sebelum dikirim, dan sejenisnya.
        </p>
        <p>
          Bedanya dengan situs serupa: file kamu <strong>tidak diupload ke server mana pun</strong>. Semua proses berjalan di
          browser, di perangkat kamu sendiri. Itu sebabnya TaliFile tetap jalan untuk dokumen pribadi, dan bisa dipakai
          offline setelah dibuka sekali.
        </p>

        <h2 className="pt-4 text-xl font-semibold tracking-tight">Cara kerjanya</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Gambar diolah lewat canvas browser, PDF lewat pdf-lib dan pdf.js.</li>
          <li>Remove Background dan Pas Foto memakai model AI yang diunduh sekali ke browser, lalu jalan di perangkatmu.</li>
          <li>OCR PDF mengunduh data bahasa saat pertama dipakai. Yang diunduh hanya data bahasanya, file kamu tetap di perangkat.</li>
          <li>
            Kunci PDF memakai enkripsi AES-256. Password tidak disimpan, jadi kalau lupa, tidak ada yang bisa membukanya,
            termasuk TaliFile.
          </li>
        </ul>

        <h2 className="pt-4 text-xl font-semibold tracking-tight">Tips</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Setelah download, kamu bisa langsung lanjut ke tool lain tanpa upload ulang. Misalnya Merge PDF, lalu Nomor Halaman, lalu Kunci PDF.</li>
          <li>Screenshot bisa langsung ditempel ke tool dengan Ctrl+V.</li>
          <li>Di Android, setelah TaliFile di-install dari menu browser, TaliFile muncul di menu Bagikan galeri dan file manager.</li>
          <li>Tekan / di beranda untuk langsung mencari tool.</li>
        </ul>

        <h2 className="pt-4 text-xl font-semibold tracking-tight">Pembuat</h2>
        <p>
          Dibuat oleh{' '}
          <a href="https://github.com/blowmamain-spec" target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-accent-500 decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
            NabF12
          </a>{' '}
          dengan bantuan Claude Code. Ada masalah atau ide tool baru? Hubungi lewat profil GitHub tersebut.
        </p>
        <p>
          Baca juga{' '}
          <Link to="/privasi" className="font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
            kebijakan privasi
          </Link>
          .
        </p>
      </div>
    </article>
  )
}
