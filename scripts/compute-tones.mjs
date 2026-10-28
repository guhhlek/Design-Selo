// Adds two fields to every catalogue photograph, computed from the local files:
//
//   edge   average colour of the outer border (the studio ground)
//   focus  [x, y] in 0–1: where the piece sits in the frame, used by
//          `object-position` whenever a frame has to crop.
//
//   node scripts/compute-tones.mjs     (also run by `npm run import`)

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA_FILE = path.join(ROOT, 'src/data/catalog.json')
const N = 64
const RING = 3

const catalog = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'))
const hex = (v) => Math.round(v).toString(16).padStart(2, '0')
const round = (v) => Math.round(v * 1000) / 1000

for (const m of Object.values(catalog.media)) {
  const file = path.join(ROOT, 'public/assets/media', String(m.id), 's.webp')
  // keep the aspect so the focal point maps back onto the real frame
  const w = m.w >= m.h ? N : Math.max(8, Math.round((N * m.w) / m.h))
  const h = m.h >= m.w ? N : Math.max(8, Math.round((N * m.h) / m.w))
  const { data } = await sharp(file).resize(w, h, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const px = (x, y) => { const i = (y * w + x) * 3; return [data[i], data[i + 1], data[i + 2]] }

  // studio ground: the border ring
  let r = 0, g = 0, b = 0, n = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= RING && x < w - RING && y >= RING && y < h - RING) continue
    const [pr, pg, pb] = px(x, y); r += pr; g += pg; b += pb; n++
  }
  const ground = [r / n, g / n, b / n]
  m.edge = `#${hex(ground[0])}${hex(ground[1])}${hex(ground[2])}`

  // subject: libvips' attention strategy (fine detail, saturation, highlights) picks
  // where a narrow strip should sit on each axis — that is where the piece is.
  // Plain contrast against the ground is not enough: pedestals and walls compete.
  const W = 256
  const H = Math.round((W * m.h) / m.w)
  const base = await sharp(file).resize(W, H, { fit: 'fill' }).toBuffer()
  const sw = Math.round(W * 0.34)
  const sh = Math.round(H * 0.34)
  const col = await sharp(base).resize({ width: sw, height: H, fit: 'cover', position: sharp.strategy.attention }).toBuffer({ resolveWithObject: true })
  const row = await sharp(base).resize({ width: W, height: sh, fit: 'cover', position: sharp.strategy.attention }).toBuffer({ resolveWithObject: true })
  const fx = (-(col.info.cropOffsetLeft ?? 0) + sw / 2) / W
  const fy = (-(row.info.cropOffsetTop ?? 0) + sh / 2) / H
  // pull slightly towards the centre so crops never hug an edge
  m.focus = [round(0.5 + (fx - 0.5) * 0.9), round(0.5 + (fy - 0.5) * 0.9)]
}

await fs.writeFile(DATA_FILE, JSON.stringify(catalog))
console.log(`edge tones and focal points for ${Object.keys(catalog.media).length} photographs`)
