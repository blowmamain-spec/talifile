import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tools } from '../src/tools.ts'
import { toolSeo } from '../src/seo.ts'
import { searchTools } from '../src/lib/search.ts'

const mainSrc = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
const iconSrc = readFileSync(new URL('../src/components/ToolIcon.tsx', import.meta.url), 'utf8')
const searchSrc = readFileSync(new URL('../src/lib/search.ts', import.meta.url), 'utf8')

const seenIds = new Set()
const seenPaths = new Set()

for (const tool of tools) {
  assert.ok(!seenIds.has(tool.id), `Duplicate tool id: ${tool.id}`)
  assert.ok(!seenPaths.has(tool.path), `Duplicate tool path: ${tool.path}`)
  assert.ok(tool.path.startsWith('/'), `Tool path must start with '/': ${tool.id} -> ${tool.path}`)
  seenIds.add(tool.id)
  seenPaths.add(tool.path)

  const slug = tool.path.slice(1)
  const routePattern = new RegExp(`(['"])${slug}\\1\\s*:|\\b${slug}\\s*:`)
  assert.ok(routePattern.test(mainSrc), `Missing lazy route in src/main.tsx for tool: ${tool.id}`)

  const iconPattern = new RegExp(`(['"])${tool.id}\\1\\s*:|\\b${tool.id}\\s*:`)
  assert.ok(iconPattern.test(iconSrc), `Missing SVG icon in src/components/ToolIcon.tsx for tool: ${tool.id}`)
  assert.ok(iconPattern.test(searchSrc), `Missing search concept mapping in src/lib/search.ts for tool: ${tool.id}`)

  const seo = toolSeo[tool.id]
  assert.ok(seo, `Missing SEO entry in src/seo.ts for tool: ${tool.id}`)
  assert.ok(seo.title.length >= 15, `SEO title too short for ${tool.id}`)
  assert.ok(seo.description.length >= 40, `SEO description too short for ${tool.id}`)
  assert.ok(seo.steps.length >= 2, `SEO steps missing for ${tool.id}`)
}

const searchCases = [
  ['pasang twibbon', 'pasang-twibbon'],
  ['twibon', 'pasang-twibbon'],
  ['pdf ke word', 'konversi'],
  ['heic ke jpg', 'konversi'],
  ['kecilin foto 200kb', 'compress'],
  ['ttd pdf', 'sign-pdf'],
  ['hapus background', 'remove-background'],
  ['gabung pdf', 'merge-pdf'],
  ['sensor ktp', 'sensor-gambar'],
  ['scan qr', 'qr-code'],
  ['buka password pdf', 'protect-pdf'],
  ['pas foto 3x4', 'pas-foto'],
]

for (const [query, expectedId] of searchCases) {
  const res = searchTools(tools, query)
  assert.ok(res.hits.length > 0, `Search returned no hits for "${query}"`)
  assert.equal(
    res.hits[0].tool.id,
    expectedId,
    `Search top hit mismatch for "${query}": got "${res.hits[0].tool.id}", expected "${expectedId}"`,
  )
}

console.log(`OK: ${tools.length} tools verified (routes, icons, SEO, search) + ${searchCases.length} search queries passed.`)
