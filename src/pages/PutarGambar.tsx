import { useEffect, useRef, useState } from 'react'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { Button, ErrorText, FileBar, baseName, canvasToBlob } from '../components/ui'
import { deliver } from '../lib/handoff'

type State = { turns: number; flipX: boolean; flipY: boolean }

function render(canvas: HTMLCanvasElement, img: ImageBitmap, s: State) {
  const quarter = ((s.turns % 4) + 4) % 4
  const swap = quarter % 2 === 1
  canvas.width = swap ? img.height : img.width
  canvas.height = swap ? img.width : img.height
  const ctx = canvas.getContext('2d')!
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((quarter * Math.PI) / 2)
  ctx.scale(s.flipX ? -1 : 1, s.flipY ? -1 : 1)
  ctx.drawImage(img, -img.width / 2, -img.height / 2)
  ctx.restore()
}

export default function PutarGambar() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<ImageBitmap | null>(null)
  const [state, setState] = useState<State>({ turns: 0, flipX: false, flipY: false })
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    try {
      setImg(await createImageBitmap(f))
      setFile(f)
      setState({ turns: 0, flipX: false, flipY: false })
      setError('')
    } catch {
      setError('File ini tidak bisa dibaca sebagai gambar.')
    }
  }

  useEffect(() => {
    if (canvasRef.current && img) render(canvasRef.current, img, state)
  }, [img, state])

  const changed = state.turns % 4 !== 0 || state.flipX || state.flipY

  async function download() {
    if (!canvasRef.current || !file) return
    const type = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
    const ext = type.split('/')[1].replace('jpeg', 'jpg')
    deliver(await canvasToBlob(canvasRef.current, type, 0.95), `${baseName(file.name)}-diputar.${ext}`)
  }

  const actions: { label: string; run: () => void }[] = [
    { label: 'Putar kiri', run: () => setState((s) => ({ ...s, turns: s.turns - 1 })) },
    { label: 'Putar kanan', run: () => setState((s) => ({ ...s, turns: s.turns + 1 })) },
    { label: 'Balik kiri-kanan', run: () => setState((s) => ({ ...s, flipX: !s.flipX })) },
    { label: 'Balik atas-bawah', run: () => setState((s) => ({ ...s, flipY: !s.flipY })) },
  ]

  return (
    <ToolShell icon="putar-gambar" title="Putar & Balik" description="Putar gambar 90 derajat atau balik seperti cermin, misalnya foto selfie yang terbalik.">
      {!file && <Dropzone accept="image/png,image/jpeg,image/webp" onFiles={handleFiles} label="Pilih gambar" />}
      <ErrorText>{error}</ErrorText>
      {file && img && (
        <div>
          <FileBar name={file.name} onChange={() => setFile(null)} />
          <div className="mt-6 grid gap-8 md:grid-cols-[1fr_16rem]">
            <div className="flex min-h-64 items-center justify-center rounded-xl bg-surface p-3 ring-1 ring-ink/10">
              <canvas ref={canvasRef} aria-label="Pratinjau gambar" className="block max-h-[28rem] max-w-full" />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {actions.map((a) => (
                  <Button key={a.label} variant="secondary" onClick={a.run} className="!px-3">
                    {a.label}
                  </Button>
                ))}
              </div>
              <Button variant="secondary" disabled={!changed} onClick={() => setState({ turns: 0, flipX: false, flipY: false })} className="w-full">
                Kembalikan seperti awal
              </Button>
              <Button onClick={download} disabled={!changed} className="w-full">
                {changed ? 'Download gambar' : 'Putar atau balik dulu'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  )
}
