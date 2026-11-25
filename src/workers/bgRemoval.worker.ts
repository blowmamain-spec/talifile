import { preload, removeBackground } from '@imgly/background-removal'

/*
 * All background removal runs here, never on the page. The library's ndarray dependency compiles code with
 * Function(), which needs 'unsafe-eval'. vercel.json grants that to this worker file only, so the page itself
 * keeps a strict CSP, and the worker has no access to the page, its DOM, or its storage.
 * Keeping this worker alive across photos lets the library reuse its memoized ONNX session in memory.
 * Only when switching device (GPU -> CPU fallback) or model does the caller recycle the worker.
 */
type Model = 'isnet' | 'isnet_fp16' | 'isnet_quint8'
type Device = 'gpu' | 'cpu'
type Req =
  | { id: number; kind: 'preload'; model: Model; device: Device }
  | { id: number; kind: 'remove'; file: Blob; model: Model; device: Device }

const ctx = self as unknown as {
  postMessage(msg: unknown): void
  onmessage: ((e: MessageEvent<Req>) => void) | null
  fetch: typeof fetch
}

/*
 * Model files are cached here, cache-first. staticimgly.com sends no caching headers, so without this every use
 * re-downloads tens of MB. Chunk names are content hashes and resources.json sits under a versioned path, so
 * cached entries never go stale. This is not the service worker, so its 5-minute fetch limit does not apply.
 */
const MODEL_CACHE = 'bg-model-v2'
// Optional custom CDN (e.g., Cloudflare R2 bucket URL ending with '/') for faster first-time downloads in Indonesia.
const CUSTOM_PUBLIC_PATH = (import.meta.env.VITE_BG_MODEL_PUBLIC_PATH as string | undefined)?.trim() || ''
const MODEL_ORIGIN = CUSTOM_PUBLIC_PATH ? new URL(CUSTOM_PUBLIC_PATH).origin : 'https://staticimgly.com'
let fetchedFromNetwork = false

const netFetch = ctx.fetch.bind(self)
ctx.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!url.startsWith(MODEL_ORIGIN) || !('caches' in self)) return netFetch(input, init)
  try {
    const cache = await caches.open(MODEL_CACHE)
    const hit = await cache.match(url)
    if (hit) return hit
    fetchedFromNetwork = true
    const res = await netFetch(input, init)
    if (res.ok) await cache.put(url, res.clone()).catch(() => {})
    return res
  } catch {
    fetchedFromNetwork = true
    return netFetch(input, init)
  }
}

// Process messages strictly in order so an in-flight preload finishes before a queued removal runs.
let queue: Promise<void> = Promise.resolve()

ctx.onmessage = (e) => {
  const req = e.data
  queue = queue.then(async () => {
    fetchedFromNetwork = false
    const onProgress = (key: string, current: number, total: number) => {
      ctx.postMessage({
        type: 'progress',
        id: req.id,
        key,
        current,
        total,
        fromCache: !fetchedFromNetwork,
      })
    }

    const sharedConfig = {
      device: req.device,
      model: req.model,
      progress: onProgress,
      ...(CUSTOM_PUBLIC_PATH ? { publicPath: CUSTOM_PUBLIC_PATH } : {}),
    }

    try {
      if (req.kind === 'preload') {
        await preload(sharedConfig)
        ctx.postMessage({ type: 'done', id: req.id, fromCache: !fetchedFromNetwork })
      } else {
        const blob = await removeBackground(req.file, sharedConfig)
        ctx.postMessage({ type: 'done', id: req.id, blob, fromCache: !fetchedFromNetwork })
      }
    } catch (err) {
      ctx.postMessage({
        type: 'error',
        id: req.id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  })
}
