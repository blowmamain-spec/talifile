export default function Privasi() {
  return (
    <article className="max-w-2xl pt-4 sm:pt-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privasi</h1>
      <p className="mt-3 text-muted">Terakhir diperbarui 10 November 2026.</p>

      <div className="mt-8 space-y-5 leading-relaxed">
        <h2 className="text-xl font-semibold tracking-tight">File kamu</h2>
        <p>
          File yang kamu pilih di TaliFile tidak pernah dikirim ke server. Semua pengolahan terjadi di browser kamu. Begitu
          tab ditutup, file yang tadi dibuka hilang dari memori browser.
        </p>

        <h2 className="pt-2 text-xl font-semibold tracking-tight">Yang diunduh dari luar</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Model AI untuk Remove Background dan Pas Foto diunduh dari <code className="text-sm">staticimgly.com</code>.
          </li>
          <li>
            Data bahasa untuk OCR PDF diunduh dari <code className="text-sm">cdn.jsdelivr.net</code>.
          </li>
        </ul>
        <p>
          Permintaan unduhan ini hanya mengambil data. File kamu tidak ikut terkirim. Seperti semua permintaan di internet,
          penyedia tersebut bisa melihat alamat IP kamu.
        </p>

        <h2 className="pt-2 text-xl font-semibold tracking-tight">Statistik pengunjung</h2>
        <p>
          TaliFile memakai Vercel Web Analytics untuk menghitung jumlah kunjungan per halaman. Yang tercatat hanya halaman
          yang dibuka, negara, jenis perangkat, dan browser. Tidak ada cookie, tidak ada pelacakan antar situs, dan tidak
          ada isi file yang tercatat.
        </p>

        <h2 className="pt-2 text-xl font-semibold tracking-tight">Yang disimpan di perangkatmu</h2>
        <p>
          Pilihan tema dan daftar "Terakhir dipakai" disimpan di penyimpanan lokal browser. Data ini tidak keluar dari
          perangkatmu dan bisa dihapus lewat pengaturan browser. Agar bisa dipakai offline, kode aplikasi juga disimpan di
          cache browser. Model AI untuk hapus background disimpan di cache browser setelah pertama diunduh, supaya
          pemakaian berikutnya tidak perlu mengunduh ulang. Model ini berukuran puluhan MB dan bisa dihapus lewat
          pengaturan "Hapus data situs".
        </p>
      </div>
    </article>
  )
}
