// Composes an editorial gallery as justified rows: every row fills the full width,
// every photograph in a row shares one height and keeps its own proportion (no
// crop), so the images complete each other and no row leaves empty space.
//
// Rows are chosen by dynamic programming over the curated order. A row's height
// is width / (sum of aspect ratios), so the layout works in ratio units and holds
// at any width. Targets alternate between a taller row (fewer, larger
// photographs) and a denser one, which gives the page its rhythm.
import type { Media } from '../data/catalog'

export type Orientation = 'landscape' | 'portrait' | 'square'

export function orientationOf(m: Pick<Media, 'w' | 'h'>): Orientation {
  const r = m.w / m.h
  if (r > 1.15) return 'landscape'
  if (r < 0.87) return 'portrait'
  return 'square'
}

export interface GalleryRow {
  items: Media[]
  /** sum of aspect ratios: row height = row width / ratio */
  ratio: number
}

export interface GalleryOptions {
  /** ideal sum of aspect ratios per row (≈ container width / ideal row height) */
  target: number
  maxPerRow: number
}

const ratioOf = (m: Media) => m.w / m.h

function rowCost(sum: number, count: number, target: number) {
  const off = Math.log(sum / target)
  let cost = off * off
  // rows taller than intended read as gaps on the page
  if (sum < target * 0.62) cost += 4 * Math.log((target * 0.62) / sum) ** 2
  // a lone upright photograph on a wide row is exactly the empty-space problem
  if (count === 1 && sum < 1.3 && target > 1.6) cost += 2
  return cost
}

export function composeGallery(media: Media[], { target, maxPerRow }: GalleryOptions): GalleryRow[] {
  const n = media.length
  if (n === 0) return []
  const targets = [target * 0.82, target * 1.2]
  // best[i][p]: cost of laying out media[i..] when the next row has parity p
  const best: number[][] = Array.from({ length: n + 1 }, () => [Infinity, Infinity])
  const take: number[][] = Array.from({ length: n + 1 }, () => [0, 0])
  best[n] = [0, 0]
  for (let i = n - 1; i >= 0; i--) {
    for (let p = 0; p < 2; p++) {
      let sum = 0
      for (let k = 1; k <= maxPerRow && i + k <= n; k++) {
        sum += ratioOf(media[i + k - 1])
        const c = rowCost(sum, k, targets[p]) + best[i + k][1 - p]
        if (c < best[i][p]) {
          best[i][p] = c
          take[i][p] = k
        }
      }
    }
  }
  const rows: GalleryRow[] = []
  let i = 0
  let p = 0
  while (i < n) {
    const k = take[i][p]
    const items = media.slice(i, i + k)
    rows.push({ items, ratio: items.reduce((s, m) => s + ratioOf(m), 0) })
    i += k
    p = 1 - p
  }
  return rows
}
