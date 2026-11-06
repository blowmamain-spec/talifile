const KEY = 'talifile:recent'
const MAX = 4

// Per-viewer convenience only: a blocked or empty storage simply means no "recent" row.
export function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const ids = raw ? JSON.parse(raw) : []
    return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function pushRecent(id: string) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable, nothing to remember
  }
}
