import { useState } from 'react'
import { deliver as saveAs } from '../lib/handoff'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { toBlob } from '../lib/format'

type Mode = 'lock' | 'unlock'

const inputClass =
  'mt-1.5 w-full rounded-lg bg-surface px-3 py-2 text-sm outline-none ring-1 ring-ink/15 focus-visible:ring-brand-500'

export default function ProtectPdf() {
  const [mode, setMode] = useState<Mode>('lock')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [allowPrint, setAllowPrint] = useState(true)
  const [allowCopy, setAllowCopy] = useState(false)
  const [allowEdit, setAllowEdit] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  function reset() {
    setFile(null)
    setPassword('')
    setConfirm('')
    setError('')
    setDone('')
  }

  function switchMode(next: Mode) {
    setMode(next)
    reset()
  }

  const mismatch = mode === 'lock' && confirm.length > 0 && password !== confirm
  const canSubmit =
    !!file && password.length > 0 && (mode === 'unlock' || (password === confirm && password.length >= 4))

  async function run() {
    if (!file || !canSubmit) return
    setWorking(true)
    setError('')
    setDone('')
    const baseName = file.name.replace(/\.pdf$/i, '').replace(/-terkunci$/, '')
    try {
      // Loaded on demand: this pdf-lib fork is only needed here, for its encryption support.
      const { PDFDocument } = await import('@cantoo/pdf-lib')
      const bytes = new Uint8Array(await file.arrayBuffer())

      if (mode === 'lock') {
        const probe = await PDFDocument.load(bytes, { ignoreEncryption: true })
        if (probe.isEncrypted) {
          setError('PDF ini sudah dikunci. Buka kuncinya dulu kalau mau ganti password.')
          return
        }
        const doc = await PDFDocument.load(bytes)
        // The owner password is random: nobody can lift the restrictions without re-creating the file.
        const owner = crypto.getRandomValues(new Uint32Array(4)).join('-')
        doc.encrypt({
          userPassword: password,
          ownerPassword: owner,
          permissions: {
            printing: allowPrint ? 'highResolution' : false,
            copying: allowCopy,
            modifying: allowEdit,
            annotating: allowEdit,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: allowEdit,
          },
        })
        saveAs(toBlob(await doc.save(), 'application/pdf'), `${baseName}-terkunci.pdf`)
        setDone('PDF terkunci sudah didownload. Simpan password-nya baik-baik, tidak bisa dipulihkan.')
      } else {
        const probe = await PDFDocument.load(bytes, { ignoreEncryption: true })
        if (!probe.isEncrypted) {
          setError('PDF ini tidak dikunci, jadi tidak perlu dibuka.')
          return
        }
        let doc
        try {
          doc = await PDFDocument.load(bytes, { password })
        } catch {
          setError('Password salah. Coba cek lagi huruf besar kecilnya.')
          return
        }
        saveAs(toBlob(await doc.save(), 'application/pdf'), `${baseName}-terbuka.pdf`)
        setDone('PDF tanpa password sudah didownload.')
      }
    } catch (err) {
      console.error(err)
      setError(mode === 'lock' ? 'Gagal mengunci PDF. Pastikan file tidak rusak.' : 'Gagal membuka kunci PDF.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell
      icon="protect-pdf"
      title="Kunci PDF"
      description="Pasang password ke PDF (AES-256), atau lepas password dari PDF milikmu."
    >
      <div className="mb-5 flex max-w-sm gap-1 rounded-full bg-ink/5 p-1 text-sm">
        {(
          [
            ['lock', 'Kunci PDF'],
            ['unlock', 'Buka kunci'],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-pressed={mode === m}
            className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 ${
              mode === m ? 'bg-ground text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!file && (
        <Dropzone
          accept="application/pdf"
          onFiles={(files) => setFile(files[0] ?? null)}
          label="Klik atau drop file PDF di sini"
          hint={mode === 'unlock' ? 'Kamu tetap perlu tahu password-nya.' : undefined}
        />
      )}

      {file && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run()
          }}
        >
          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface ring-1 ring-ink/10 px-4 py-3.5">
            <p className="truncate font-medium">{file.name}</p>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-sm font-medium text-ink ring-1 ring-ink/15 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Ganti file
            </button>
          </div>

          <div className="mt-6 max-w-sm space-y-4">
            <div>
              <label htmlFor="pdf-password" className="text-sm font-medium">
                {mode === 'lock' ? 'Password baru' : 'Password PDF'}
              </label>
              <input
                id="pdf-password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'lock' ? 'new-password' : 'off'}
                className={inputClass}
              />
              {mode === 'lock' && password.length > 0 && password.length < 4 && (
                <p className="mt-1 text-xs text-muted">Minimal 4 karakter.</p>
              )}
            </div>

            {mode === 'lock' && (
              <div>
                <label htmlFor="pdf-password-confirm" className="text-sm font-medium">
                  Ulangi password
                </label>
                <input
                  id="pdf-password-confirm"
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={mismatch}
                  className={`${inputClass} ${mismatch ? 'ring-red-500' : ''}`}
                />
                {mismatch && <p className="mt-1 text-xs text-danger">Password belum sama.</p>}
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
                className="h-4 w-4 accent-brand-500"
              />
              Tampilkan password
            </label>
          </div>

          {mode === 'lock' && (
            <fieldset className="mt-6 space-y-2">
              <legend className="mb-2 text-sm font-medium">Setelah dibuka, orang lain boleh:</legend>
              {(
                [
                  [allowPrint, setAllowPrint, 'Mencetak'],
                  [allowCopy, setAllowCopy, 'Menyalin teks'],
                  [allowEdit, setAllowEdit, 'Mengubah isi dan halaman'],
                ] as [boolean, (v: boolean) => void, string][]
              ).map(([value, set, label]) => (
                <label key={label} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => set(e.target.checked)}
                    className="h-4 w-4 accent-brand-500"
                  />
                  {label}
                </label>
              ))}
              <p className="pt-1 text-xs text-muted">
                Batasan ini dipatuhi oleh aplikasi PDF umum, tapi bukan pengaman mutlak.
              </p>
            </fieldset>
          )}

          {error && (
            <p className="mt-4 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          {done && (
            <p className="mt-4 text-sm text-brand-700" role="status">
              {done}
            </p>
          )}

          <button
            type="submit"
            disabled={working || !canSubmit}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Memproses…' : mode === 'lock' ? 'Kunci & Download' : 'Buka Kunci & Download'}
          </button>
        </form>
      )}
    </ToolShell>
  )
}
