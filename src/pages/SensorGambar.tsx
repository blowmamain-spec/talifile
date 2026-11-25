import { useEffect, useState } from 'react'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import RectEditor from '../components/RectEditor'
import type { Rect } from '../components/RectEditor'
import { Button, Chips, ErrorText, FileBar, baseName, canvasToBlob } from '../components/ui'
import { deliver } from '../lib/handoff'

type Mode = 'hitam' | 'pixel' | 'blur'

/** Shrinks the area hard and scales it back up: smoothing on gives blur, off gives pixel blocks. Works in every browser, unlike ctx.filter. */
function obscure(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number, smooth: boolean) {
  const factor = smooth ? 0.04 : 0.06
  const tw = Math.max(1, Math.round(w * factor))
  const th = Math.max(1, Math.round(h * factor))
  const tmp = document.createElement('canvas')
  tmp.width = tw
  tmp.height = th
  const t = tmp.getContext('2d')!
  t.drawImage(img, x, y, w, h, 0, 0, tw, th)
  ctx.save()
  ctx.imageSmoothingEnabled = smooth
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tmp, 0, 0, tw, th, x, y, w, h)
  ctx.restore()
}

export default function SensorGambar() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [rects, setRects] = useState<Rect[]>([])
  const [mode, setMode] = useState<Mode>('hitam')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    setUrl(URL.createObjectURL(f))
    setRects([])
    setError('')
  }

  async function download() {
    if (!file) return
    setWorking(true)
    setError('')
    try {
      const img = await createImageBitmap(file)
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      for (const r of rects) {
        const x = Math.round(r.x * c.width)
        const y = Math.round(r.y * c.height)
        const w = Math.max(1, Math.round(r.w * c.width))
        const h = Math.max(1, Math.round(r.h * c.height))
        if (mode === 'hitam') {
          ctx.fillStyle = '#000'
          ctx.fillRect(x, y, w, h)
        } else {
          obscure(ctx, img, x, y, w, h, mode === 'blur')
        }
      }
      const png = file.type === 'image/png'
      deliver(await canvasToBlob(c, png ? 'image/png' : 'image/jpeg', 0.92), `${baseName(file.name)}-disensor.${png ? 'png' : 'jpg'}`)
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan gambar. Coba lagi.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell
      icon="sensor-gambar"
      title="Sensor Gambar"
      description="Tutup bagian yang tidak boleh terlihat, seperti NIK, alamat, atau wajah, sebelum foto dikirim."
    >
      {!file && <Dropzone accept="image/png,image/jpeg,image/webp" onFiles={handleFiles} label="Pilih gambar" hint="Misalnya foto KTP atau screenshot" />}

      {file && (
        <div>
          <FileBar name={file.name} onChange={() => setFile(null)} />
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_16rem]">
            <div>
              <RectEditor
                src={url}
                alt="Gambar yang akan disensor"
                rects={rects}
                onChange={setRects}
                renderRect={() =>
                  mode === 'hitam' ? (
                    <div className="h-full w-full bg-black" />
                  ) : (
                    <div className={`h-full w-full ${mode === 'blur' ? 'backdrop-blur-lg' : 'backdrop-blur-sm'} bg-white/10 ring-1 ring-white/40`} />
                  )
                }
              />
              <p className="mt-2 text-sm text-muted">Tarik kotak di atas gambar untuk menandai area. Bisa lebih dari satu.</p>
            </div>
            <div className="space-y-5">
              <Chips
                name="mode"
                legend="Cara menutup"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'hitam', label: 'Kotak hitam' },
                  { value: 'pixel', label: 'Pixel' },
                  { value: 'blur', label: 'Blur' },
                ]}
              />
              {mode !== 'hitam' && (
                <p className="text-sm text-muted">Untuk angka penting seperti NIK atau nomor rekening, kotak hitam paling aman.</p>
              )}
              <ErrorText>{error}</ErrorText>
              <Button onClick={download} disabled={working || rects.length === 0} className="w-full">
                {working ? 'Menyimpan…' : rects.length === 0 ? 'Tandai area dulu' : `Download (${rects.length} area)`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
