import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { inject } from '@vercel/analytics'
import './index.css'
import Layout from './Layout'
import ErrorBoundary from './components/ErrorBoundary'

// Cookieless page-view counts only (see /privasi). The script is served from this same origin by Vercel.
if (import.meta.env.PROD) inject()

// Older versions cached the background-removal model in the service worker (100+ MB). That route is gone, so free the space.
if ('caches' in window) caches.delete('bg-removal-model').catch(() => {})

const pages = {
  'remove-background': lazy(() => import('./pages/RemoveBackground')),
  'pas-foto': lazy(() => import('./pages/PasFoto')),
  'pasang-twibbon': lazy(() => import('./pages/PasangTwibbon')),
  compress: lazy(() => import('./pages/Compress')),
  'crop-resize': lazy(() => import('./pages/CropResize')),
  'resize-banyak': lazy(() => import('./pages/ResizeBanyak')),
  'putar-gambar': lazy(() => import('./pages/PutarGambar')),
  'convert-image': lazy(() => import('./pages/ConvertImage')),
  'sensor-gambar': lazy(() => import('./pages/SensorGambar')),
  'watermark-gambar': lazy(() => import('./pages/WatermarkGambar')),
  'hapus-metadata': lazy(() => import('./pages/HapusMetadata')),
  collage: lazy(() => import('./pages/Collage')),
  'image-to-pdf': lazy(() => import('./pages/ImageToPdf')),
  'merge-pdf': lazy(() => import('./pages/MergePdf')),
  'split-pdf': lazy(() => import('./pages/SplitPdf')),
  'organize-pdf': lazy(() => import('./pages/OrganizePdf')),
  'sign-pdf': lazy(() => import('./pages/SignPdf')),
  'tambah-teks-pdf': lazy(() => import('./pages/TambahTeksPdf')),
  'fill-pdf-form': lazy(() => import('./pages/FillPdfForm')),
  'sensor-pdf': lazy(() => import('./pages/SensorPdf')),
  'watermark-pdf': lazy(() => import('./pages/WatermarkPdf')),
  'page-numbers': lazy(() => import('./pages/PageNumbers')),
  'protect-pdf': lazy(() => import('./pages/ProtectPdf')),
  'pdf-to-image': lazy(() => import('./pages/PdfToImage')),
  'pdf-ke-teks': lazy(() => import('./pages/PdfKeTeks')),
  'ocr-pdf': lazy(() => import('./pages/OcrPdf')),
  'ukuran-halaman': lazy(() => import('./pages/UkuranHalaman')),
  'n-up': lazy(() => import('./pages/NUp')),
  'crop-pdf': lazy(() => import('./pages/CropPdf')),
  'info-pdf': lazy(() => import('./pages/InfoPdf')),
  'qr-code': lazy(() => import('./pages/QrCode')),
  konversi: lazy(() => import('./pages/Konversi')),
  tentang: lazy(() => import('./pages/Tentang')),
  privasi: lazy(() => import('./pages/Privasi')),
  share: lazy(() => import('./pages/Share')),
}

const Home = lazy(() => import('./pages/Home'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <p className="py-16 text-center text-sm text-muted" role="status">
      Memuat…
    </p>
  )
}

// Clear the stale-chunk auto-reload guard once the app boots cleanly.
try {
  sessionStorage.removeItem('talifile:chunk-reload')
} catch {
  // ignore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              {Object.entries(pages).map(([path, Page]) => (
                <Route key={path} path={path} element={<Page />} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
