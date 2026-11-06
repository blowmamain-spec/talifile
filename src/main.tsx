import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { inject } from '@vercel/analytics'
import './index.css'
import Layout from './Layout'

// Cookieless page-view counts only (see /privasi). The script is served from this same origin by Vercel.
if (import.meta.env.PROD) inject()

const pages = {
  'remove-background': lazy(() => import('./pages/RemoveBackground')),
  'pas-foto': lazy(() => import('./pages/PasFoto')),
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
