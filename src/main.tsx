import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './Layout'
import Home from './pages/Home'
import RemoveBackground from './pages/RemoveBackground'
import Compress from './pages/Compress'
import ImageToPdf from './pages/ImageToPdf'
import PdfToImage from './pages/PdfToImage'
import MergePdf from './pages/MergePdf'
import OrganizePdf from './pages/OrganizePdf'
import WatermarkPdf from './pages/WatermarkPdf'
import SignPdf from './pages/SignPdf'
import SplitPdf from './pages/SplitPdf'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="remove-background" element={<RemoveBackground />} />
          <Route path="compress" element={<Compress />} />
          <Route path="image-to-pdf" element={<ImageToPdf />} />
          <Route path="pdf-to-image" element={<PdfToImage />} />
          <Route path="merge-pdf" element={<MergePdf />} />
          <Route path="organize-pdf" element={<OrganizePdf />} />
          <Route path="watermark-pdf" element={<WatermarkPdf />} />
          <Route path="sign-pdf" element={<SignPdf />} />
          <Route path="split-pdf" element={<SplitPdf />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
