import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Halaman ini tidak ada</h1>
      <p className="mt-2 text-muted">Mungkin link-nya salah ketik, atau tool-nya sudah pindah alamat.</p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        Lihat semua tools
      </Link>
    </div>
  )
}
