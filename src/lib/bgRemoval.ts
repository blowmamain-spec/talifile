export type BgModel = 'isnet' | 'isnet_fp16' | 'isnet_quint8'

const MODEL_CACHE = 'bg-model-v2'
// v2: ignore flags written while a CSP bug broke every path, which said nothing about the GPU.
const CPU_FLAG = 'talifile:bg-cpu:v2'

export const DEFAULT_BG_MODEL: BgModel = 'isnet_quint8'

function rememberCpu() {
  try {
    localStorage.setItem(CPU_FLAG, '1')
  } catch {
    // storage blocked: the GPU attempt will simply be tried again next time
  }
}

function gpuKnownBad() {
  try {
    return localStorage.getItem(CPU_FLAG) === '1'
  } catch {
    return false
  }
}

let webGpuSupport: Promise<boolean> | null = null
function hasWebGpu() {
  if (!webGpuSupport) {
    webGpuSupport = (async () => {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
      if (!gpu) return false
      try {
        return (await gpu.requestAdapter()) !== null
      } catch {
        return false
      }
    })()
  }
  return webGpuSupport
}

/** Asks the browser not to evict cached AI models when disk space runs low. */
function requestPersistentStorage() {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {})
  }
}

/**
 * Verifies whether every chunk of the given model is already saved in Cache Storage.
 * Reads only the small resources.json manifest and cache URL keys (never the binary weights).
 */
export async function isModelCached(model: BgModel): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) return false
  try {
    const cache = await caches.open(MODEL_CACHE)
    const keys = await cache.keys()
    const manifestReq = keys.find((k) => k.url.endsWith('/resources.json'))
    if (!manifestReq) return false
    const manifestRes = await cache.match(manifestReq)
    if (!manifestRes) return false
    const manifest = (await manifestRes.json()) as Record<string, { chunks?: { name: string }[] }>
    const entry = manifest[`/models/${model}`]
    if (!entry?.chunks?.length) return false
    const cachedUrls = new Set(keys.map((k) => k.url))
    return entry.chunks.every((chunk) => cachedUrls.has(new URL(chunk.name, manifestReq.url).toString()))
  } catch {
    return false
  }
}

/** Returns total bytes stored inside the AI model cache (0 if empty or unavailable). */
export async function getModelCacheSize(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0
  try {
    const cache = await caches.open(MODEL_CACHE)
    const keys = await cache.keys()
    let total = 0
    for (const req of keys) {
      const res = await cache.match(req)
      if (!res) continue
      const cl = Number(res.headers.get('content-length'))
      if (Number.isFinite(cl) && cl > 0) {
        total += cl
      } else {
        const blob = await res.blob()
        total += blob.size
      }
    }
    return total
  } catch {
    return 0
  }
}

/** Deletes all cached AI background-removal models and shuts down the persistent worker to free disk & RAM. */
export async function clearModelCache(): Promise<void> {
  disposeWorker('Cache model dihapus')
  if (typeof window !== 'undefined' && 'caches' in window) {
    await caches.delete(MODEL_CACHE).catch(() => {})
  }
}

function label(key: string, current: number, total: number, cpu: boolean, fromCache: boolean) {
  const pct = total ? Math.round((current / total) * 100) : 0
  if (key.startsWith('fetch')) {
    return fromCache ? `Memuat model dari perangkat… ${pct}%` : `Mengunduh model… ${pct}%`
  }
  return cpu ? `Memproses (mode CPU, lebih lambat)… ${pct}%` : `Memproses gambar… ${pct}%`
}

// Persistent singleton worker: kept alive across photos so the ONNX session stays warm in memory.
type ActiveWorker = {
  worker: Worker
  model: BgModel
  device: 'gpu' | 'cpu'
  warm: boolean
  pending: Map<
    number,
    {
      kind: 'preload' | 'remove'
      resolve: (v: Blob | void) => void
      reject: (e: Error) => void
      onProgress: (s: string) => void
    }
  >
}

let active: ActiveWorker | null = null
let nextReqId = 1

function disposeWorker(reason?: string) {
  if (!active) return
  const old = active
  active = null
  old.worker.terminate()
  if (reason) {
    const err = new Error(reason)
    for (const p of old.pending.values()) p.reject(err)
    old.pending.clear()
  }
}

function getWorker(model: BgModel, device: 'gpu' | 'cpu'): ActiveWorker {
  if (active && active.model === model && active.device === device) return active
  // Recycle worker only when switching model or device (ONNX runtime is cached per worker).
  disposeWorker('Model diganti')

  const worker = new Worker(new URL('../workers/bgRemoval.worker.ts', import.meta.url), { type: 'module' })
  const entry: ActiveWorker = { worker, model, device, warm: false, pending: new Map() }

  worker.onmessage = (e) => {
    const m = e.data as
      | { type: 'progress'; id: number; key: string; current: number; total: number; fromCache: boolean }
      | { type: 'done'; id: number; blob?: Blob; fromCache: boolean }
      | { type: 'error'; id: number; message: string }

    const job = entry.pending.get(m.id)
    if (!job) return

    if (m.type === 'progress') {
      const text = label(m.key, m.current, m.total, entry.device === 'cpu', m.fromCache)
      job.onProgress(text)
      // If a user drops a photo while preload is still running, mirror preload progress to the queued removal.
      if (job.kind === 'preload') {
        for (const [otherId, other] of entry.pending) {
          if (otherId !== m.id) other.onProgress(text)
        }
      }
      return
    }

    entry.pending.delete(m.id)
    if (m.type === 'done') {
      entry.warm = true
      requestPersistentStorage()
      job.resolve(m.blob)
    } else {
      // On error, drop the worker so the next attempt starts with a clean runtime.
      if (active === entry) disposeWorker()
      job.reject(new Error(m.message))
    }
  }

  worker.onerror = (e) => {
    const msg = e.message || 'Worker gagal dijalankan'
    if (active === entry) disposeWorker(msg)
    else {
      const err = new Error(msg)
      for (const p of entry.pending.values()) p.reject(err)
      entry.pending.clear()
    }
  }

  active = entry
  return entry
}

export function isModelWarm(model: BgModel): boolean {
  return Boolean(active && active.model === model && active.warm)
}

function runWorkerJob(
  kind: 'preload' | 'remove',
  model: BgModel,
  device: 'gpu' | 'cpu',
  onProgress: (s: string) => void,
  isCancelled: () => boolean,
  file?: Blob,
): Promise<Blob | void> {
  return new Promise((resolve, reject) => {
    if (isCancelled()) {
      reject(new Error('cancelled'))
      return
    }

    const entry = getWorker(model, device)
    const id = nextReqId++

    const timer = setInterval(() => {
      if (isCancelled()) {
        clearInterval(timer)
        entry.pending.delete(id)
        // Terminating stops an active download or inference immediately and frees memory.
        if (active === entry) disposeWorker()
        reject(new Error('cancelled'))
      }
    }, 300)

    entry.pending.set(id, {
      kind,
      onProgress,
      resolve: (val) => {
        clearInterval(timer)
        resolve(val)
      },
      reject: (err) => {
        clearInterval(timer)
        reject(err)
      },
    })

    if (kind === 'preload') entry.worker.postMessage({ id, kind: 'preload', model, device })
    else entry.worker.postMessage({ id, kind: 'remove', file, model, device })
  })
}

async function preferredDevice(): Promise<'gpu' | 'cpu'> {
  if (!gpuKnownBad() && (await hasWebGpu())) return 'gpu'
  return 'cpu'
}

/**
 * Warms up a model inside the persistent worker.
 * Pass `onlyIfCached: true` for silent background warm-up on page load without spending user bandwidth.
 */
export async function warmupBackgroundModel(
  model: BgModel,
  options: { onlyIfCached?: boolean; onProgress?: (s: string) => void; isCancelled?: () => boolean } = {},
): Promise<boolean> {
  if (isModelWarm(model)) return true
  if (options.onlyIfCached && !(await isModelCached(model))) return false

  const onProgress = options.onProgress ?? (() => {})
  const isCancelled = options.isCancelled ?? (() => false)
  const dev = await preferredDevice()

  try {
    await runWorkerJob('preload', model, dev, onProgress, isCancelled)
    return true
  } catch (err) {
    if (isCancelled()) return false
    if (dev === 'gpu') {
      console.warn('[TaliFile] WebGPU warm-up gagal, pindah ke CPU:', err)
      try {
        await runWorkerJob('preload', model, 'cpu', onProgress, isCancelled)
        rememberCpu()
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

/**
 * Removes the background with the fastest path that works on this device:
 * reuses a warm persistent worker when available; otherwise tries WebGPU -> CPU -> smallest quantized model.
 * Throws an Error whose message lists every attempt, for the "detail" shown to the user.
 */
export async function removeBackgroundSafe(
  file: Blob,
  model: BgModel,
  onProgress: (s: string) => void,
  isCancelled: () => boolean = () => false,
): Promise<Blob> {
  const failures: string[] = []
  let gpuFailed = false

  if (!gpuKnownBad() && (await hasWebGpu())) {
    try {
      const blob = await runWorkerJob('remove', model, 'gpu', onProgress, isCancelled, file)
      return blob as Blob
    } catch (err) {
      if (isCancelled()) throw new Error('cancelled')
      failures.push(`GPU: ${err instanceof Error ? err.message : String(err)}`)
      console.warn('[TaliFile] WebGPU gagal, pindah ke CPU:', err)
      gpuFailed = true
      onProgress('GPU tidak didukung, pindah ke mode CPU…')
    }
  }

  try {
    const blob = (await runWorkerJob('remove', model, 'cpu', onProgress, isCancelled, file)) as Blob
    // CPU worked where the GPU did not: the GPU or driver is the problem, so skip it on this device from now on.
    if (gpuFailed) rememberCpu()
    return blob
  } catch (err) {
    if (isCancelled()) throw new Error('cancelled')
    failures.push(`CPU ${model}: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Low-memory devices: the quantized model is a fraction of the size.
  if (model !== 'isnet_quint8') {
    try {
      onProgress('Mencoba model yang lebih ringan…')
      return (await runWorkerJob('remove', 'isnet_quint8', 'cpu', onProgress, isCancelled, file)) as Blob
    } catch (err) {
      if (isCancelled()) throw new Error('cancelled')
      failures.push(`CPU isnet_quint8: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  throw new Error(failures.join(' | '))
}
