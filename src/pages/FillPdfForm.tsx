import { useState } from 'react'
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  PDFOptionList,
} from 'pdf-lib'
import { saveAs } from 'file-saver'
import ToolShell from '../components/ToolShell'
import Dropzone from '../components/Dropzone'
import { toBlob } from '../lib/format'
import { friendlyPdfError } from '../lib/pdfErrors'

type FieldKind = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'optionList'
type FieldDesc = {
  name: string
  kind: FieldKind
  label: string
  options?: string[]
  multiline?: boolean
}

export default function FillPdfForm() {
  const [file, setFile] = useState<File | null>(null)
  const [fields, setFields] = useState<FieldDesc[]>([])
  const [values, setValues] = useState<Record<string, string | string[] | boolean>>({})
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    setFile(f)
    setFields([])
    setValues({})
    setError('')
    setLoading(true)
    try {
      const bytes = await f.arrayBuffer()
      const pdfDoc = await PDFDocument.load(bytes)
      const form = pdfDoc.getForm()
      const rawFields = form.getFields()
      const descs: FieldDesc[] = []
      const initial: Record<string, string | string[] | boolean> = {}

      for (const field of rawFields) {
        const name = field.getName()
        if (field instanceof PDFTextField) {
          descs.push({ name, kind: 'text', label: name, multiline: field.isMultiline() })
          initial[name] = field.getText() ?? ''
        } else if (field instanceof PDFCheckBox) {
          descs.push({ name, kind: 'checkbox', label: name })
          initial[name] = field.isChecked()
        } else if (field instanceof PDFRadioGroup) {
          descs.push({ name, kind: 'radio', label: name, options: field.getOptions() })
          initial[name] = field.getSelected() ?? ''
        } else if (field instanceof PDFDropdown) {
          descs.push({ name, kind: 'dropdown', label: name, options: field.getOptions() })
          initial[name] = field.getSelected()[0] ?? ''
        } else if (field instanceof PDFOptionList) {
          descs.push({ name, kind: 'optionList', label: name, options: field.getOptions() })
          initial[name] = field.getSelected()
        }
      }
      setFields(descs)
      setValues(initial)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal membuka PDF. Pastikan file tidak rusak.'))
    } finally {
      setLoading(false)
    }
  }

  function setValue(name: string, value: string | string[] | boolean) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function save() {
    if (!file) return
    setWorking(true)
    setError('')
    try {
      const bytes = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(bytes)
      const form = pdfDoc.getForm()

      for (const desc of fields) {
        const field = form.getField(desc.name)
        const value = values[desc.name]
        if (field instanceof PDFTextField && typeof value === 'string') {
          field.setText(value || undefined)
        } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
          if (value) field.check()
          else field.uncheck()
        } else if (field instanceof PDFRadioGroup && typeof value === 'string' && value) {
          field.select(value)
        } else if (field instanceof PDFDropdown && typeof value === 'string' && value) {
          field.select(value)
        } else if (field instanceof PDFOptionList && Array.isArray(value) && value.length) {
          field.select(value)
        }
      }

      const outBytes = await pdfDoc.save()
      saveAs(toBlob(outBytes, 'application/pdf'), `${file.name.replace(/\.pdf$/i, '')}-filled.pdf`)
    } catch (err) {
      console.error(err)
      setError(friendlyPdfError(err, 'Gagal menyimpan PDF.'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell
      icon="fill-pdf-form"
      title="Isi Form PDF"
      description="Isi field formulir PDF (AcroForm) langsung di browser, tanpa print."
    >
      {!file && (
        <Dropzone
          accept="application/pdf"
          onFiles={handleFiles}
          label="Klik atau drop file PDF di sini"
        />
      )}

      {loading && <p className="mt-4 text-sm text-ink/55">Membuka PDF…</p>}
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {file && !loading && fields.length === 0 && !error && (
        <p className="mt-4 text-sm text-ink/50">
          PDF ini tidak punya field formulir yang bisa diisi.
        </p>
      )}

      {fields.length > 0 && (
        <div>
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="mb-1.5 block text-sm font-medium">{f.label}</label>
                {f.kind === 'text' && (
                  <textarea
                    value={(values[f.name] as string) ?? ''}
                    onChange={(e) => setValue(f.name, e.target.value)}
                    rows={f.multiline ? 4 : 1}
                    autoComplete="off"
                    className="w-full resize-none rounded-lg bg-ink/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-transparent focus-visible:ring-brand-500"
                  />
                )}
                {f.kind === 'checkbox' && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(values[f.name] as boolean) ?? false}
                      onChange={(e) => setValue(f.name, e.target.checked)}
                      className="accent-brand-500"
                    />
                    {(values[f.name] as boolean) ? 'Dicentang' : 'Tidak dicentang'}
                  </label>
                )}
                {f.kind === 'radio' && (
                  <div className="flex flex-wrap gap-2">
                    {f.options?.map((opt) => (
                      <label
                        key={opt}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors ${
                          values[f.name] === opt
                            ? 'bg-brand-500/10 text-brand-700 ring-1 ring-brand-500'
                            : 'bg-ink/5 text-ink/65 hover:bg-ink/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name={f.name}
                          checked={values[f.name] === opt}
                          onChange={() => setValue(f.name, opt)}
                          className="sr-only"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                {f.kind === 'dropdown' && (
                  <select
                    value={(values[f.name] as string) ?? ''}
                    onChange={(e) => setValue(f.name, e.target.value)}
                    className="w-full rounded-lg bg-ink/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-transparent focus-visible:ring-brand-500"
                  >
                    <option value="">Pilih…</option>
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                {f.kind === 'optionList' && (
                  <select
                    multiple
                    value={(values[f.name] as string[]) ?? []}
                    onChange={(e) =>
                      setValue(
                        f.name,
                        Array.from(e.target.selectedOptions, (o) => o.value),
                      )
                    }
                    className="w-full rounded-lg bg-ink/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-transparent focus-visible:ring-brand-500"
                  >
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={save}
            disabled={working}
            className="mt-6 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {working ? 'Menyimpan…' : 'Simpan PDF'}
          </button>
        </div>
      )}
    </ToolShell>
  )
}
