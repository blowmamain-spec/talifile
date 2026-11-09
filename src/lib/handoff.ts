import { useSyncExternalStore } from 'react'
import { saveAs } from 'file-saver'

/*
 * Moves files between tools without a download/upload round trip.
 * - pending: files waiting for the next tool's Dropzone (from "Lanjut ke..." or the share sheet).
 * - lastOutput: the file a tool just produced, offered to compatible tools.
 */

let pending: File[] | null = null

export function setPendingFiles(files: File[]) {
  pending = files
}

export function clearPendingFiles() {
  pending = null
}

function matchesAccept(file: File, accept: string) {
  return accept.split(',').some((a) => {
    const rule = a.trim()
    if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1))
    return file.type === rule || (rule.startsWith('.') && file.name.toLowerCase().endsWith(rule))
  })
}

/** Takes the waiting files the caller accepts. Files it cannot take are dropped, never silently kept for later. */
export function takePendingFiles(accept: string): File[] | null {
  if (!pending) return null
  const files = pending.filter((f) => matchesAccept(f, accept))
  pending = null
  return files.length ? files : null
}

type Output = { file: File; from: string }
let lastOutput: Output | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function clearLastOutput() {
  if (!lastOutput) return
  lastOutput = null
  emit()
}

export function useLastOutput() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => lastOutput,
  )
}

let currentTool = ''
export function setCurrentTool(id: string) {
  currentTool = id
}

/*
 * Custom download name, set from the "Nama file" field every tool shows. Empty means automatic.
 * The tool still decides the extension, so a typed "laporan" becomes "laporan.pdf".
 */
let nameOverride = ''
const nameListeners = new Set<() => void>()
let burst = { at: 0, count: 0 }

export function setNameOverride(v: string) {
  nameOverride = v
  nameListeners.forEach((l) => l())
}

export function useNameOverride() {
  return useSyncExternalStore(
    (l) => {
      nameListeners.add(l)
      return () => nameListeners.delete(l)
    },
    () => nameOverride,
  )
}

function finalName(auto: string) {
  const custom = nameOverride.trim().replace(/[\\/:*?"<>|]+/g, '-')
  if (!custom) return auto
  const ext = auto.match(/\.[a-z0-9]+$/i)?.[0] ?? ''
  const base = ext && custom.toLowerCase().endsWith(ext.toLowerCase()) ? custom.slice(0, -ext.length) : custom
  // Tools that save several files in one go (one per page, say) get -2, -3 so they do not overwrite each other.
  const now = Date.now()
  burst = now - burst.at < 2500 ? { at: now, count: burst.count + 1 } : { at: now, count: 1 }
  return `${base}${burst.count > 1 ? `-${burst.count}` : ''}${ext}`
}

/** Drop-in replacement for file-saver's saveAs: downloads (with the custom name if set), then offers the result to other tools. */
export function deliver(blob: Blob, name: string) {
  const final = finalName(name)
  saveAs(blob, final)
  lastOutput = { file: new File([blob], final, { type: blob.type }), from: currentTool }
  emit()
}

/*
 * Object URLs made through objectUrl() remember their blob. Reading a blob: URL back with fetch() is blocked by
 * our CSP (connect-src has no blob:), which silently broke downloads in production, so never fetch them.
 */
const blobsByUrl = new Map<string, Blob>()

export function objectUrl(blob: Blob) {
  const url = URL.createObjectURL(blob)
  blobsByUrl.set(url, blob)
  return url
}

export function blobFromUrl(url: string): Blob {
  const blob = blobsByUrl.get(url)
  if (!blob) throw new Error('Hasil tidak ditemukan, proses ulang file-nya.')
  return blob
}

/** For tools whose result is shown through an object URL: same as deliver. */
export function deliverFromUrl(url: string, name: string) {
  deliver(blobFromUrl(url), name)
}
