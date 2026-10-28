// Exports the opening-sequence photographs at native resolution.
// The scroll camera zooms deep into these frames, so they bypass the 2000px
// catalogue cap. Run after import-catalog.mjs.
//
//   node scripts/build-hero-assets.mjs

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const sources = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts/media-sources.json'), 'utf8'))
const CACHE = path.join(ROOT, '.cache/originals')
const OUT = path.join(ROOT, 'public/assets/hero')

// id -> published name. Both are Contrapeso photographs from dsgnselo.com.
const FRAMES = {
  10732: 'contrapeso-parede',
  10691: 'contrapeso-pendentes',
}
// l: desktop (native, ≤3440), m: phones/tablets
const SIZES = { l: 3440, m: 2200 }

await fs.mkdir(CACHE, { recursive: true })
await fs.mkdir(OUT, { recursive: true })

for (const [id, name] of Object.entries(FRAMES)) {
  const cached = path.join(CACHE, `${id}.jpg`)
  if (!(await fs.stat(cached).catch(() => null))) {
    const res = await fetch(sources[id])
    await fs.writeFile(cached, Buffer.from(await res.arrayBuffer()))
  }
  for (const [size, width] of Object.entries(SIZES)) {
    const file = path.join(OUT, `${name}-${size}.webp`)
    const info = await sharp(cached).resize({ width, withoutEnlargement: true }).webp({ quality: 84, smartSubsample: true }).toFile(file)
    console.log(`${name}-${size}.webp ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}KB`)
  }
}
