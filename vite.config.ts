import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

// `vite preview` serves the same security headers as production (vercel.json), so CSP problems show up locally first.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const prodHeaders = Object.fromEntries(
  (vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []).map((h) => [h.key, h.value]),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TaliFile: Toolkit File & Gambar',
        short_name: 'TaliFile',
        description:
          'Remove background, compress, kolase, tanda tangan, kunci, dan olah PDF. Gratis dan langsung di browser.',
        theme_color: '#faf8f5',
        background_color: '#faf8f5',
        display: 'standalone',
        start_url: '/',
        lang: 'id',
        // Installed on Android, TaliFile shows up in the share sheet of the gallery and file manager.
        share_target: {
          action: '/share',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: { files: [{ name: 'files', accept: ['image/*', 'application/pdf', '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic'] }] },
        },
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The 3 MB HEIC decoder is only needed by iPhone users of Convert: cached on first use instead of for every visitor.
        globIgnores: ['**/heic-to-*.js', '**/og.png'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Share target: stash the shared files in a cache the /share page reads, then show that page.
            // Self-contained on purpose: workbox serializes this function into the service worker.
            urlPattern: ({ url }) => url.pathname === '/share',
            method: 'POST',
            handler: async ({ request }) => {
              const form = await request.formData()
              // @ts-expect-error caches exists in the service worker this runs in, not in the Node types of this config.
              const cache = await caches.open('share-target')
              for (const key of await cache.keys()) await cache.delete(key)
              let i = 0
              for (const entry of form.getAll('files')) {
                if (typeof entry === 'string') continue
                await cache.put(
                  `/shared-file/${i++}`,
                  new Response(entry, { headers: { 'content-type': entry.type, 'x-file-name': encodeURIComponent(entry.name) } }),
                )
              }
              return Response.redirect('/share', 303)
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/heic-to-'),
            handler: 'CacheFirst',
            options: { cacheName: 'heic-decoder', expiration: { maxEntries: 2 } },
          },
          // The background-removal model (staticimgly.com) is deliberately NOT routed through the service worker:
          // its ~25 parallel 4 MB chunks can take minutes on slow connections, and Chrome kills a service worker
          // fetch after 5 minutes, which failed the whole download. The browser HTTP cache (ETag) handles reuse.
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  preview: {
    headers: prodHeaders,
  },
})
