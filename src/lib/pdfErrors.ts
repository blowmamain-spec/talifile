import { EncryptedPDFError } from 'pdf-lib'

export function friendlyPdfError(err: unknown, fallback: string): string {
  if (err instanceof EncryptedPDFError) {
    return 'PDF ini dikunci password. Buka dulu kuncinya (lewat Acrobat/Preview) sebelum diproses di sini.'
  }
  if (err instanceof Error && err.name === 'PasswordException') {
    return 'PDF ini dikunci password. Buka dulu kuncinya (lewat Acrobat/Preview) sebelum diproses di sini.'
  }
  return fallback
}
