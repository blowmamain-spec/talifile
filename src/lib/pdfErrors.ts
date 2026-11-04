import { EncryptedPDFError } from 'pdf-lib'

const LOCKED_MESSAGE =
  'PDF ini dikunci password. Lepas dulu password-nya lewat tool "Kunci PDF" (tab Buka kunci), lalu proses lagi di sini.'

export function friendlyPdfError(err: unknown, fallback: string): string {
  if (err instanceof EncryptedPDFError) return LOCKED_MESSAGE
  if (err instanceof Error && err.name === 'PasswordException') return LOCKED_MESSAGE
  return fallback
}
