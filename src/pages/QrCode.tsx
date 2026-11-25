import { useEffect, useRef, useState } from 'react'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, Chips, ErrorText, Panel, TextField, canvasToBlob } from '../components/ui'
import { deliver } from '../lib/handoff'

type Tab = 'buat' | 'baca'
type Kind = 'link' | 'teks' | 'wifi'
type Security = 'WPA' | 'WEP' | 'nopass'

/** WiFi QR format understood by Android and iOS camera apps; special characters must be escaped. */
function wifiPayload(ssid: string, pass: string, sec: Security, hidden: boolean) {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
  return `WIFI:T:${sec};S:${esc(ssid)};${sec === 'nopass' ? '' : `P:${esc(pass)};`}${hidden ? 'H:true;' : ''};`
}

function BuatQr() {
  const [kind, setKind] = useState<Kind>('link')
  const [link, setLink] = useState('https://')
  const [text, setText] = useState('')
  const [ssid, setSsid] = useState('')
  const [pass, setPass] = useState('')
  const [sec, setSec] = useState<Security>('WPA')
  const [hidden, setHidden] = useState(false)
  const [dark, setDark] = useState('#16140f')
  const [logo, setLogo] = useState<ImageBitmap | null>(null)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const payload = kind === 'link' ? (link.trim() === 'https://' ? '' : link.trim()) : kind === 'teks' ? text : ssid ? wifiPayload(ssid, pass, sec, hidden) : ''

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const canvas = canvasRef.current
      if (!canvas) return
      if (!payload) {
        canvas.width = canvas.height = 0
        return
      }
      const QRCode = (await import('qrcode')).default
      try {
        // High error correction leaves room for a logo covering the middle.
        await QRCode.toCanvas(canvas, payload, { width: 720, margin: 3, errorCorrectionLevel: logo ? 'H' : 'M', color: { dark, light: '#ffffff' } })
        if (cancelled) return
        if (logo) {
          const ctx = canvas.getContext('2d')!
          const size = canvas.width * 0.22
          const x = (canvas.width - size) / 2
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.roundRect(x - 10, x - 10, size + 20, size + 20, 16)
          ctx.fill()
          const s = Math.min(size / logo.width, size / logo.height)
          ctx.drawImage(logo, (canvas.width - logo.width * s) / 2, (canvas.width - logo.height * s) / 2, logo.width * s, logo.height * s)
        }
        setError('')
      } catch {
        setError('Teksnya terlalu panjang untuk satu QR code.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [payload, dark, logo])

  async function downloadPng() {
    if (canvasRef.current) deliver(await canvasToBlob(canvasRef.current), 'qr-code.png')
  }

  async function downloadSvg() {
    const QRCode = (await import('qrcode')).default
    const svg = await QRCode.toString(payload, { type: 'svg', margin: 3, errorCorrectionLevel: 'M', color: { dark, light: '#ffffff' } })
    deliver(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg')
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,18rem)]">
      <div className="space-y-5">
        <Chips name="kind" legend="Isi QR" value={kind} onChange={setKind} options={[{ value: 'link', label: 'Link' }, { value: 'teks', label: 'Teks' }, { value: 'wifi', label: 'WiFi' }]} />
        {kind === 'link' && <TextField label="Alamat link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://contoh.com" />}
        {kind === 'teks' && (
          <label className="block">
            <span className="text-sm font-medium">Teks</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1200} className="mt-1.5 w-full rounded-lg bg-surface px-3 py-2 text-sm outline-none ring-1 ring-ink/15 focus-visible:ring-2 focus-visible:ring-brand-500" />
          </label>
        )}
        {kind === 'wifi' && (
          <div className="space-y-4">
            <TextField label="Nama WiFi (SSID)" value={ssid} onChange={(e) => setSsid(e.target.value)} />
            <Chips name="sec" legend="Keamanan" value={sec} onChange={setSec} options={[{ value: 'WPA', label: 'WPA/WPA2/WPA3' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'Tanpa password' }]} />
            {sec !== 'nopass' && <TextField label="Password WiFi" value={pass} onChange={(e) => setPass(e.target.value)} />}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-4 w-4 accent-brand-500" />
              Jaringan tersembunyi
            </label>
            <p className="text-xs text-muted">Password hanya dipakai untuk membuat gambar QR di browser ini, tidak dikirim ke mana pun.</p>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-5">
          <label className="text-sm font-medium">
            Warna
            <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="mt-1.5 block h-11 w-16 cursor-pointer rounded-lg bg-surface ring-1 ring-ink/15" />
          </label>
          <div>
            <p className="text-sm font-medium">Logo di tengah (opsional)</p>
            <div className="mt-1.5 flex gap-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-surface px-4 text-sm font-medium ring-1 ring-ink/15 hover:bg-ink/5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-500">
                {logo ? 'Ganti logo' : 'Pilih logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) setLogo(await createImageBitmap(f).catch(() => null))
                  }}
                />
              </label>
              {logo && <Button variant="secondary" onClick={() => setLogo(null)}>Hapus logo</Button>}
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-ink/15">
          <canvas ref={canvasRef} aria-label="QR code" className={`h-full w-full ${payload && !error ? '' : 'hidden'}`} />
          {(!payload || error) && <p className="px-6 text-center text-sm text-gray-600">{error || 'QR code muncul di sini setelah isinya diisi.'}</p>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={downloadPng} disabled={!payload || !!error}>PNG</Button>
          <Button variant="secondary" onClick={downloadSvg} disabled={!payload || !!error || !!logo} title={logo ? 'SVG belum mendukung logo' : undefined}>SVG</Button>
        </div>
        {logo && <p className="mt-2 text-xs text-muted">SVG tanpa logo. Pakai PNG kalau butuh logo.</p>}
      </div>
    </div>
  )
}

function BacaQr() {
  const [result, setResult] = useState<string | null>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setError('')
    setResult(null)
    setPreview(URL.createObjectURL(f))
    try {
      const img = await createImageBitmap(f)
      // Large photos are scaled down first: jsQR is faster and just as accurate around 1200 px.
      const s = Math.min(1, 1200 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, c.width, c.height)
      const jsQR = (await import('jsqr')).default
      const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: 'attemptBoth' })
      if (code?.data) setResult(code.data)
      else setError('QR code tidak ketemu. Pastikan QR terlihat jelas, tidak terpotong, dan tidak buram.')
    } catch {
      setError('File ini tidak bisa dibaca sebagai gambar.')
    }
  }

  const isUrl = result !== null && /^https?:\/\//i.test(result)

  return (
    <div className="space-y-5">
      <Dropzone accept="image/png,image/jpeg,image/webp" onFiles={handleFiles} label="Pilih gambar atau screenshot berisi QR" compact={!!preview} />
      <ErrorText>{error}</ErrorText>
      {preview && (
        <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
          <img src={preview} alt="Gambar yang dibaca" className="w-full rounded-xl ring-1 ring-ink/15" />
          {result !== null && (
            <Panel>
              <p className="text-sm font-medium text-muted">Isi QR</p>
              <p className="mt-1 break-all font-mono text-sm">{result}</p>
              {isUrl && <p className="mt-3 text-xs text-muted">Periksa alamatnya dulu sebelum dibuka. QR dari sumber tidak jelas bisa mengarah ke situs penipuan.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(result).catch(() => {})
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? 'Tersalin' : 'Salin'}
                </Button>
                {isUrl && (
                  <a href={result} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center rounded-full bg-brand-500 px-5 text-sm font-medium text-on-brand hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
                    Buka link
                  </a>
                )}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  )
}

export default function QrCode() {
  const [tab, setTab] = useState<Tab>('buat')
  return (
    <ToolShell icon="qr-code" title="QR Code" description="Buat QR untuk link, teks, atau WiFi, atau baca isi QR dari gambar dan screenshot.">
      <div role="tablist" aria-label="Mode QR" className="mb-6 inline-flex rounded-full bg-surface p-1 ring-1 ring-ink/10">
        {(['buat', 'baca'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-10 rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${tab === t ? 'bg-ink text-ground' : 'text-muted hover:text-ink'}`}
          >
            {t === 'buat' ? 'Buat QR' : 'Baca QR'}
          </button>
        ))}
      </div>
      {tab === 'buat' ? <BuatQr /> : <BacaQr />}
    </ToolShell>
  )
}
