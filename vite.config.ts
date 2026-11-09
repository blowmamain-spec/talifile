import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { tools } from './src/tools.ts'
import { pageSeo, toolSeo } from './src/seo.ts'

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

const SITE = 'https://talifile.nfab.my.id'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Writes one static HTML page per tool (pas-foto.html, ...) from the built index.html, with its own title,
 * description, canonical URL, JSON-LD, and readable content, plus sitemap.xml. Search engines get real text
 * without running JavaScript; visitors get the same app, which replaces the static content when it starts.
 * Vercel's cleanUrls serves /pas-foto from pas-foto.html.
 */
function prerenderPages(): Plugin {
  function head(html: string, p: { title: string; description: string; path: string; jsonLd: object }) {
    const url = `${SITE}${p.path}`
    return html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
      .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(p.description)}" />`)
      .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`)
      .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(p.title)}" />`)
      .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(p.description)}" />`)
      .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
      .replace('</head>', `<script type="application/ld+json">${JSON.stringify(p.jsonLd).replace(/</g, '\\u003c')}</script>\n  </head>`)
  }
  const body = (html: string, inner: string) =>
    html.replace('<div id="root"></div>', `<div id="root"><div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">${inner}</div></div>`)
  const nav = `<p><a href="/" class="font-display text-xl font-bold">TaliFile</a></p>`
  const noscript = `<noscript><p class="mt-6">TaliFile butuh JavaScript untuk mengolah file langsung di browser kamu.</p></noscript>`

  return {
    name: 'prerender-pages',
    enforce: 'post',
    generateBundle(_, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') this.error('prerender-pages: index.html not found in bundle')
      const template = String(index.source)
      const app = { '@type': 'WebApplication', operatingSystem: 'Any (browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' }, inLanguage: 'id' }

      for (const tool of tools) {
        const seo = toolSeo[tool.id]
        if (!seo) this.error(`prerender-pages: no SEO copy for ${tool.id} (add it to src/seo.ts)`)
        const related = tools.filter((t) => t.id !== tool.id && t.category === tool.category).slice(0, 8)
        const inner = `${nav}
<h1 class="mt-8 text-3xl font-semibold tracking-tight">${esc(tool.title)}</h1>
<p class="mt-3 max-w-2xl">${esc(seo.intro)}</p>
<h2 class="mt-8 text-xl font-semibold">Cara pakai</h2>
<ol class="mt-2 list-decimal space-y-1 pl-5">${seo.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
<p class="mt-6">Semua proses berjalan di browser kamu sendiri. Gratis, tanpa akun, dan file tidak diupload ke server.</p>
<h2 class="mt-8 text-xl font-semibold">Tool lain</h2>
<ul class="mt-2 space-y-1">${related.map((t) => `<li><a href="${t.path}">${esc(t.title)}</a>: ${esc(t.description)}</li>`).join('')}</ul>
${noscript}`
        const html = body(head(template, { title: seo.title, description: seo.description, path: tool.path, jsonLd: { '@context': 'https://schema.org', ...app, name: `${tool.title} · TaliFile`, description: seo.description, url: `${SITE}${tool.path}`, applicationCategory: tool.category === 'pdf' ? 'BusinessApplication' : 'MultimediaApplication' } }), inner)
        this.emitFile({ type: 'asset', fileName: `${tool.path.slice(1)}.html`, source: html })
      }

      for (const path of ['/tentang', '/privasi']) {
        const p = pageSeo[path]
        const html = body(head(template, { ...p, path, jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: p.title, description: p.description, url: `${SITE}${path}` } }), `${nav}<h1 class="mt-8 text-3xl font-semibold tracking-tight">${esc(p.title)}</h1><p class="mt-3 max-w-2xl">${esc(p.description)}</p>${noscript}`)
        this.emitFile({ type: 'asset', fileName: `${path.slice(1)}.html`, source: html })
      }

      // Home: the full tool list as plain links, so every tool page is one click from the root.
      const home = pageSeo['/']
      const list = tools.map((t) => `<li><a href="${t.path}"><strong>${esc(t.title)}</strong></a>: ${esc(t.description)}</li>`).join('')
      index.source = body(
        head(template, { ...home, path: '/', jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'TaliFile', url: `${SITE}/`, description: home.description, inLanguage: 'id' } }),
        `${nav}<h1 class="mt-8 text-3xl font-bold tracking-tight">Kerjain file &amp; gambar tanpa upload ke mana-mana.</h1><p class="mt-3 max-w-2xl">${esc(home.description)}</p><ul class="mt-6 space-y-1">${list}</ul>${noscript}`,
      )

      const urls = ['/', ...tools.map((t) => t.path), '/tentang', '/privasi']
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    prerenderPages(),
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
