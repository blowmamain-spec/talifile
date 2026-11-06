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

/** Drop-in replacement for file-saver's saveAs: downloads, then offers the result to other tools. */
export function deliver(blob: Blob, name: string) {
  saveAs(blob, name)
  lastOutput = { file: new File([blob], name, { type: blob.type }), from: currentTool }
  emit()
}

/** For tools that download through a plain <a download> link: records the result without a second download. */
export async function offerFromUrl(url: string, name: string) {
  const blob = await (await fetch(url)).blob()
  lastOutput = { file: new File([blob], name, { type: blob.type }), from: currentTool }
  emit()
}
