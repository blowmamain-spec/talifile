import { removeBackground } from '@imgly/background-removal'

// CPU fallback runs here: a worker gets its own copy of the library, so a failed WebGPU
// runtime on the main thread (cached globally by the library) cannot break this attempt.
type Req = { file: Blob; model: 'isnet' | 'isnet_fp16' | 'isnet_quint8' }
const ctx = self as unknown as { postMessage(msg: unknown): void; onmessage: ((e: MessageEvent<Req>) => void) | null }

ctx.onmessage = async (e) => {
  const { file, model } = e.data
  try {
    const blob = await removeBackground(file, {
      device: 'cpu',
      model,
      progress: (key, current, total) => ctx.postMessage({ type: 'progress', key, current, total }),
    })
    ctx.postMessage({ type: 'done', blob })
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
