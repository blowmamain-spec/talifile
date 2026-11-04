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
