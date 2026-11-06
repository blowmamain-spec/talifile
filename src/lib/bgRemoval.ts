export type BgModel = 'isnet' | 'isnet_fp16' | 'isnet_quint8'

const CPU_FLAG = 'talifile:bg-cpu'

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

function runInWorker(file: Blob, model: BgModel, onProgress: (s: string) => void, isCancelled: () => boolean) {
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
      if (m.type === 'progress') onProgress(label(m.key, m.current, m.total, true))
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
    worker.postMessage({ file, model })
  })
}

/**
 * Removes the background with the fastest path that works on this device:
 * WebGPU on the main thread first, then CPU in a fresh worker, then the smallest model on CPU.
 * Throws an Error whose message lists every attempt, for the "detail" shown to the user.
 */
export async function removeBackgroundSafe(
  file: Blob,
  model: BgModel,
  onProgress: (s: string) => void,
  isCancelled: () => boolean = () => false,
): Promise<Blob> {
  const failures: string[] = []

  if (!gpuKnownBad() && (await hasWebGpu())) {
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      return await removeBackground(file, {
        device: 'gpu',
        proxyToWorker: true,
        model,
        progress: (key, cur, total) => onProgress(label(key, cur, total, false)),
      })
    } catch (err) {
      if (isCancelled()) throw new Error('cancelled')
      failures.push(`GPU: ${err instanceof Error ? err.message : String(err)}`)
      // This GPU or driver cannot run the model: go straight to CPU on this device from now on.
      rememberCpu()
      onProgress('GPU tidak didukung, pindah ke mode CPU…')
    }
  }

  try {
    return await runInWorker(file, model, onProgress, isCancelled)
  } catch (err) {
    if (isCancelled()) throw new Error('cancelled')
    failures.push(`CPU ${model}: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Low-memory devices: the quantized model is a fraction of the size.
  if (model !== 'isnet_quint8') {
    try {
      onProgress('Mencoba model yang lebih ringan…')
      return await runInWorker(file, 'isnet_quint8', onProgress, isCancelled)
    } catch (err) {
      if (isCancelled()) throw new Error('cancelled')
      failures.push(`CPU isnet_quint8: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  throw new Error(failures.join(' | '))
}
