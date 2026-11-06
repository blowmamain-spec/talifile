/*
 * Lossless metadata removal: drop the segments/chunks that carry EXIF, GPS, XMP and comments,
 * keep the pixel data byte for byte. ICC color profiles are kept so colors do not shift.
 */

export function stripJpeg(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Bukan JPEG')
  const out: Uint8Array[] = [bytes.subarray(0, 2)]
  let i = 2
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) throw new Error('Struktur JPEG tidak dikenal')
    const marker = bytes[i + 1]
    // Start of scan: the rest is image data, copy as is.
    if (marker === 0xda) {
      out.push(bytes.subarray(i))
      break
    }
    const len = (bytes[i + 2] << 8) | bytes[i + 3]
    const seg = bytes.subarray(i, i + 2 + len)
    // APP1 (EXIF/XMP), APP13 (IPTC/Photoshop), COM (comment) go; APP2 (ICC) and the rest stay.
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe
    if (!drop) out.push(seg)
    i += 2 + len
  }
  return concat(out)
}

export function stripPng(bytes: Uint8Array): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47]
  if (!sig.every((b, k) => bytes[k] === b)) throw new Error('Bukan PNG')
  const out: Uint8Array[] = [bytes.subarray(0, 8)]
  const dropTypes = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'])
  let i = 8
  while (i < bytes.length) {
    const len = ((bytes[i] << 24) >>> 0) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3]
    const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7])
    const end = i + 12 + len
    if (!dropTypes.has(type)) out.push(bytes.subarray(i, end))
    i = end
    if (type === 'IEND') break
  }
  return concat(out)
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const res = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    res.set(p, o)
    o += p.length
  }
  return res
}
