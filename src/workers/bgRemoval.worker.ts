import { removeBackground } from '@imgly/background-removal'

/*
 * All background removal runs here, never on the page. The library's ndarray dependency compiles code with
 * Function(), which needs 'unsafe-eval'. vercel.json grants that to this worker file only, so the page itself
 * keeps a strict CSP, and the worker has no access to the page, its DOM, or its storage.
 * Each attempt (GPU, CPU) gets a fresh worker because the library caches its runtime globally.
 */
type Req = { file: Blob; model: 'isnet' | 'isnet_fp16' | 'isnet_quint8'; device: 'gpu' | 'cpu' }
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
const netFetch = ctx.fetch.bind(self)
ctx.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!url.startsWith('https://staticimgly.com/') || !('caches' in self)) return netFetch(input, init)
  try {
    const cache = await caches.open(MODEL_CACHE)
    const hit = await cache.match(url)
    if (hit) return hit
    const res = await netFetch(input, init)
    if (res.ok) await cache.put(url, res.clone()).catch(() => {})
    return res
  } catch {
    return netFetch(input, init)
  }
}

ctx.onmessage = async (e) => {
  const { file, model, device } = e.data
  try {
    const blob = await removeBackground(file, {
      device,
      model,
      progress: (key, current, total) => ctx.postMessage({ type: 'progress', key, current, total }),
    })
    ctx.postMessage({ type: 'done', blob })
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
