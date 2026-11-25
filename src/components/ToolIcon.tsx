const paths: Record<string, React.ReactNode> = {
  'remove-background': (
    <>
      <rect x="3" y="3" width="14" height="14" rx="2.5" />
      <circle cx="8" cy="8.5" r="1.8" />
      <path d="M3 14.5 7 10l3 3 3-3.5 4 5" strokeLinejoin="round" />
    </>
  ),
  compress: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V3.5h3.5M17 7V3.5h-3.5M3 13v3.5h3.5M17 13v3.5h-3.5" />
      <path strokeLinecap="round" d="M7 7 3.5 3.5M13 7l3.5-3.5M7 13l-3.5 3.5M13 13l3.5 3.5" />
    </>
  ),
  'convert-image': (
    <>
      <rect x="2.5" y="4" width="8" height="8" rx="1.6" />
      <circle cx="5.1" cy="6.6" r="0.85" />
      <path d="M2.5 10.5 4.8 8l1.9 1.9 1.4-1.7 1.9 2.3" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6a5.5 5.5 0 0 1 5.5 5.5M17.5 9v2.5H15" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 13a5.5 5.5 0 0 1-9-4.1" />
    </>
  ),
  'crop-resize': (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2v11a1 1 0 0 0 1 1h11" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 18V7a1 1 0 0 0-1-1H2" />
    </>
  ),
  'image-to-pdf': (
    <>
      <rect x="2.5" y="4" width="8.5" height="8.5" rx="1.6" />
      <circle cx="5.3" cy="6.7" r="1" />
      <path d="M2.5 11 5 8.5l2 2 1.5-1.8 2 2.3" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10h4M15 8l2 2-2 2" />
    </>
  ),
  'pdf-to-image': (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H4.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1H9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h5" />
      <rect x="9.5" y="7.5" width="8" height="8" rx="1.6" />
      <circle cx="12" cy="10" r="0.9" />
      <path d="M9.5 14 11.7 11.8l1.8 1.8 1.3-1.5 1.7 2" strokeLinejoin="round" />
    </>
  ),
  'merge-pdf': (
    <>
      <rect x="2.5" y="3" width="9" height="11.5" rx="1.6" />
      <rect x="8.5" y="5.5" width="9" height="11.5" rx="1.6" fill="var(--color-ground)" />
      <path strokeLinecap="round" d="M11.5 9h4M13.5 9v4" />
    </>
  ),
  'organize-pdf': (
    <>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.4" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.4" />
    </>
  ),
  'watermark-pdf': (
    <>
      <rect x="3" y="2.5" width="14" height="15" rx="1.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 13.5 13 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h1.2M7 10h4" opacity="0.5" />
    </>
  ),
  'sign-pdf': (
    <>
      <rect x="3" y="2.5" width="14" height="15" rx="1.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5c1-2.5 2-3.5 2.7-2.5s0 2.5 1 2.5 1-3 2-3 .8 2 2 .2" />
    </>
  ),
  'fill-pdf-form': (
    <>
      <rect x="3" y="2.5" width="14" height="15" rx="1.8" />
      <rect x="6" y="6" width="2.4" height="2.4" rx="0.5" />
      <path strokeLinecap="round" d="M10 7.2h4" />
      <rect x="6" y="11" width="2.4" height="2.4" rx="0.5" />
      <path strokeLinecap="round" d="M10 12.2h4" />
    </>
  ),
  'ocr-pdf': (
    <>
      <rect x="3" y="2.5" width="11" height="15" rx="1.8" />
      <path strokeLinecap="round" d="M6 7h5M6 10h5M6 13h3" opacity="0.5" />
      <circle cx="14.5" cy="14.5" r="2.6" />
      <path strokeLinecap="round" d="M16.4 16.4 18 18" />
    </>
  ),
  'page-numbers': (
    <>
      <rect x="3" y="2.5" width="14" height="15" rx="1.8" />
      <path strokeLinecap="round" d="M6.5 6.5h7M6.5 9.5h7" opacity="0.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.2l1.2-.9v3.2" />
    </>
  ),
  'protect-pdf': (
    <>
      <rect x="4" y="8.5" width="12" height="9" rx="1.8" />
      <path strokeLinecap="round" d="M7 8.5V6a3 3 0 0 1 6 0v2.5" />
      <path strokeLinecap="round" d="M10 12v2" />
    </>
  ),
  collage: (
    <>
      <rect x="2.5" y="2.5" width="8" height="15" rx="1.4" />
      <rect x="12" y="2.5" width="5.5" height="6.5" rx="1.2" />
      <rect x="12" y="11" width="5.5" height="6.5" rx="1.2" />
    </>
  ),
  konversi: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h11.5M12.5 4l3 3-3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 13H4.5M7.5 10l-3 3 3 3" />
    </>
  ),
  'pas-foto': (
    <>
      <rect x="4" y="2.5" width="12" height="15" rx="1.6" />
      <circle cx="10" cy="8" r="2.4" />
      <path strokeLinecap="round" d="M6.2 15c.8-2.2 2.2-3.3 3.8-3.3s3 1.1 3.8 3.3" />
    </>
  ),
  'pasang-twibbon': (
    <>
      <rect x="2.5" y="2.5" width="15" height="15" rx="2.2" />
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.2" />
      <circle cx="8.5" cy="8.7" r="1.1" />
      <path strokeLinejoin="round" d="M5.7 13.5 8.2 11l1.8 1.8 1.5-1.6 2.8 2.8" />
    </>
  ),
  'resize-banyak': (
    <>
      <rect x="5.5" y="5.5" width="11" height="11" rx="1.6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 13V4.8a1.3 1.3 0 0 1 1.3-1.3H13" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13l4-4M10.5 9H13v2.5" />
    </>
  ),
  'putar-gambar': (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 9.5a5.5 5.5 0 1 1 1.6 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.2 5.5v4h4" />
    </>
  ),
  'sensor-gambar': (
    <>
      <rect x="2.5" y="4" width="15" height="12" rx="1.8" />
      <rect x="5" y="8" width="7" height="3" rx="0.6" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" d="M5 13.3h4" opacity="0.5" />
    </>
  ),
  'watermark-gambar': (
    <>
      <rect x="2.5" y="4" width="15" height="12" rx="1.8" />
      <path strokeLinecap="round" d="M6 13l8-6" />
      <path strokeLinecap="round" d="M5.5 7.5h2.5" opacity="0.5" />
    </>
  ),
  'hapus-metadata': (
    <>
      <path strokeLinejoin="round" d="M10 17.5s5-4.3 5-8.6A5 5 0 0 0 5 8.9c0 4.3 5 8.6 5 8.6Z" />
      <path strokeLinecap="round" d="M8 7l4 4m0-4-4 4" />
    </>
  ),
  'tambah-teks-pdf': (
    <>
      <rect x="3" y="2.5" width="14" height="15" rx="1.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5h7M10 6.5v7" />
    </>
  ),
  'sensor-pdf': (
    <>
      <rect x="3" y="2.5" width="14" height="15" rx="1.8" />
      <path strokeLinecap="round" d="M6 6.5h8" opacity="0.5" />
      <rect x="6" y="9" width="8" height="2.6" rx="0.5" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" d="M6 14h5" opacity="0.5" />
    </>
  ),
  'pdf-ke-teks': (
    <>
      <rect x="3" y="2.5" width="14" height="15" rx="1.8" />
      <path strokeLinecap="round" d="M6 6.5h8M6 9.5h8M6 12.5h5" />
    </>
  ),
  'ukuran-halaman': (
    <>
      <rect x="3" y="5" width="9" height="12.5" rx="1.4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2.5h7.5a1 1 0 0 1 1 1V12" strokeDasharray="1.6 1.8" />
    </>
  ),
  'n-up': (
    <>
      <rect x="2.5" y="3" width="15" height="14" rx="1.6" />
      <path d="M10 3v14" />
      <path strokeLinecap="round" d="M4.8 6.5h3M12.2 6.5h3M4.8 9h3M12.2 9h3" opacity="0.5" />
    </>
  ),
  'crop-pdf': (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 2v11.5a1 1 0 0 0 1 1H18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 5.5h11.5a1 1 0 0 1 1 1V18" />
    </>
  ),
  'info-pdf': (
    <>
      <rect x="3" y="2.5" width="14" height="15" rx="1.8" />
      <circle cx="10" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" d="M10 9.5v4.5" />
    </>
  ),
  'qr-code': (
    <>
      <rect x="3" y="3" width="5.5" height="5.5" rx="1" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" />
      <path strokeLinecap="round" d="M11.5 11.5h2v2M17 11.5v0M15.5 15.5H17V17M11.5 17h1.5" />
    </>
  ),
  'split-pdf': (
    <>
      <rect x="2.5" y="3" width="6.5" height="14" rx="1.6" />
      <rect x="11" y="3" width="6.5" height="14" rx="1.6" />
      <path strokeDasharray="1.6 1.8" strokeLinecap="round" d="M10 3v14" />
    </>
  ),
}

export default function ToolIcon({ id, className }: { id: string; className?: string }) {
  const content = paths[id]
  if (!content) return null
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className={className}
    >
      {content}
    </svg>
  )
}
