export type BgModel = 'isnet' | 'isnet_fp16' | 'isnet_quint8'

// v2: ignore flags written while a CSP bug broke every path, which said nothing about the GPU.
const CPU_FLAG = 'talifile:bg-cpu:v2'

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

async function hasWebGpu() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu) return false
  try {
    return (await gpu.requestAdapter()) !== null
  } catch {
    return false
  }
}

function label(key: string, current: number, total: number, cpu: boolean) {
  const pct = total ? Math.round((current / total) * 100) : 0
  if (key.startsWith('fetch')) return `Mengunduh model… ${pct}%`
  return cpu ? `Memproses (mode CPU, lebih lambat)… ${pct}%` : `Memproses gambar… ${pct}%`
}

function runInWorker(file: Blob, model: BgModel, device: 'gpu' | 'cpu', onProgress: (s: string) => void, isCancelled: () => boolean) {
  return new Promise<Blob>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/bgRemoval.worker.ts', import.meta.url), { type: 'module' })
    const timer = setInterval(() => {
      if (isCancelled()) {
        worker.terminate()
        clearInterval(timer)
        reject(new Error('cancelled'))
      }
    }, 300)
    worker.onmessage = (e) => {
      const m = e.data
      if (m.type === 'progress') onProgress(label(m.key, m.current, m.total, device === 'cpu'))
      else {
        clearInterval(timer)
        worker.terminate()
        if (m.type === 'done') resolve(m.blob)
        else reject(new Error(m.message))
      }
    }
    worker.onerror = (e) => {
      clearInterval(timer)
      worker.terminate()
      reject(new Error(e.message || 'Worker gagal dijalankan'))
    }
    worker.postMessage({ file, model, device })
  })
}

/**
 * Removes the background with the fastest path that works on this device:
 * WebGPU first, then CPU, then the smallest model on CPU, each in a fresh worker (see bgRemoval.worker.ts for why).
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
      return await runInWorker(file, model, 'gpu', onProgress, isCancelled)
    } catch (err) {
      if (isCancelled()) throw new Error('cancelled')
      failures.push(`GPU: ${err instanceof Error ? err.message : String(err)}`)
      console.warn('[TaliFile] WebGPU gagal, pindah ke CPU:', err)
      gpuFailed = true
      onProgress('GPU tidak didukung, pindah ke mode CPU…')
    }
  }

  try {
    const blob = await runInWorker(file, model, 'cpu', onProgress, isCancelled)
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
      return await runInWorker(file, 'isnet_quint8', 'cpu', onProgress, isCancelled)
    } catch (err) {
      if (isCancelled()) throw new Error('cancelled')
      failures.push(`CPU isnet_quint8: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  throw new Error(failures.join(' | '))
}
