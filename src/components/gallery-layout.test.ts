import { describe, expect, it } from 'vitest'
import { catalog, collections, getMedia, type Media } from '../data/catalog'
import { composeGallery, orientationOf } from './gallery-layout'

const m = (id: number, w: number, h: number): Media => ({ id, w, h, tone: '#000' })
const V = (id: number) => m(id, 900, 1200)
const H = (id: number) => m(id, 1600, 1000)
const DESKTOP = { target: 2.5, maxPerRow: 4 }
const PHONE = { target: 1.25, maxPerRow: 2 }

describe('gallery layout', () => {
  it('classifies proportions', () => {
    expect(orientationOf(H(1))).toBe('landscape')
    expect(orientationOf(V(1))).toBe('portrait')
    expect(orientationOf(m(1, 1000, 1000))).toBe('square')
  })

  it('uses every photograph exactly once, in the curated order', () => {
    const media = [V(1), H(2), V(3), V(4), V(5), H(6), V(7)]
    const ids = composeGallery(media, DESKTOP).flatMap((r) => r.items.map((x) => x.id))
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('never leaves an upright photograph alone on a desktop row', () => {
    const rows = composeGallery([V(1), V(2), V(3), H(4), V(5)], DESKTOP)
    for (const r of rows) {
      if (r.items.length === 1) expect(orientationOf(r.items[0])).not.toBe('portrait')
    }
  })

  // the real galleries: rows should stay within the screen at desktop proportions
  // (row height = width / ratio; on a 16:10 screen a ratio of 1.5 is ~90% of the height)
  it.each(collections.filter((c) => c.gallery.length > 1).map((c) => [c.slug, c] as const))(
    '%s: every desktop row is between a band and a screen tall',
    (_, c) => {
      const media = [...new Set(c.gallery)].filter((id) => id !== c.cover).map((id) => getMedia(id)!).filter(Boolean)
      for (const r of composeGallery(media, DESKTOP)) {
        if (media.length >= 2) expect(r.ratio).toBeGreaterThan(1.45)
        expect(r.ratio).toBeLessThan(5)
      }
      for (const r of composeGallery(media, PHONE)) expect(r.items.length).toBeLessThanOrEqual(2)
    },
  )

  it('covers the catalogue', () => {
    expect(Object.keys(catalog.media).length).toBeGreaterThan(0)
  })
})
