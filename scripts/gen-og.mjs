// Renders public/og.png (link preview image) from scripts/og.svg. Needs sharp: npm i --no-save sharp
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
await sharp(resolve(here, 'og.svg')).png().toFile(resolve(here, '../public/og.png'))
console.log('wrote public/og.png')
