import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'

// `vite preview` serves the same security headers as production (vercel.json), so CSP problems show up locally first.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
/** Applies vercel.json header rules per request path, the way Vercel does (sources here are plain regexes). */
function previewHeaders(): Plugin {
  const rules = vercel.headers.map((r) => ({ re: new RegExp('^' + r.source + '$'), headers: r.headers }))
  return {
    name: 'preview-vercel-headers',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '/').split('?')[0]
        for (const r of rules) if (r.re.test(path)) for (const h of r.headers) res.setHeader(h.key, h.value)
        next()
      })
    },
  }
}

/**
 * @imgly/background-removal downloads onnxruntime's wasm glue from its CDN and loads it from a blob: URL,
 * which our CSP (script-src without blob:) blocks, so background removal failed in production.
 * onnxruntime's bundles already embed that glue and load their wasm from this origin, so this drops the override.
 * The build fails loudly if the library changes shape, instead of silently shipping the broken path.
 */
function ortSameOrigin(): Plugin {
  const pattern = /const wasmPath = await loadAsUrl\([^;]+;\s*const mjsPath = await loadAsUrl\([^;]+;\s*ort2\.env\.wasm\.wasmPaths = \{[^}]*\};/
  return {
    name: 'ort-same-origin',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').includes('@imgly/background-removal/dist/index.mjs')) return
      if (!pattern.test(code)) this.error('ort-same-origin: wasmPaths override not found, check @imgly/background-removal')
      return code.replace(pattern, '/* ort-same-origin: use onnxruntime defaults (same-origin, CSP-safe) */')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    ortSameOrigin(),
    previewHeaders(),
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
    plugins: () => [ortSameOrigin()],
  },
})
