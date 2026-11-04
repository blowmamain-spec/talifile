import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './Layout'

const Home = lazy(() => import('./pages/Home'))
const RemoveBackground = lazy(() => import('./pages/RemoveBackground'))
const Compress = lazy(() => import('./pages/Compress'))
const ImageToPdf = lazy(() => import('./pages/ImageToPdf'))
const PdfToImage = lazy(() => import('./pages/PdfToImage'))
const MergePdf = lazy(() => import('./pages/MergePdf'))
const OrganizePdf = lazy(() => import('./pages/OrganizePdf'))
const WatermarkPdf = lazy(() => import('./pages/WatermarkPdf'))
const SignPdf = lazy(() => import('./pages/SignPdf'))
const SplitPdf = lazy(() => import('./pages/SplitPdf'))
const CropResize = lazy(() => import('./pages/CropResize'))
const ConvertImage = lazy(() => import('./pages/ConvertImage'))
const FillPdfForm = lazy(() => import('./pages/FillPdfForm'))
const OcrPdf = lazy(() => import('./pages/OcrPdf'))

function RouteFallback() {
  return <p className="py-16 text-center text-sm text-ink/40">Memuat…</p>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="remove-background" element={<RemoveBackground />} />
            <Route path="compress" element={<Compress />} />
            <Route path="crop-resize" element={<CropResize />} />
            <Route path="convert-image" element={<ConvertImage />} />
            <Route path="fill-pdf-form" element={<FillPdfForm />} />
            <Route path="ocr-pdf" element={<OcrPdf />} />
            <Route path="image-to-pdf" element={<ImageToPdf />} />
            <Route path="pdf-to-image" element={<PdfToImage />} />
            <Route path="merge-pdf" element={<MergePdf />} />
            <Route path="organize-pdf" element={<OrganizePdf />} />
            <Route path="watermark-pdf" element={<WatermarkPdf />} />
            <Route path="sign-pdf" element={<SignPdf />} />
            <Route path="split-pdf" element={<SplitPdf />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
