// Typed access to the catalogue imported by scripts/import-catalog.mjs.
// Every text and photograph comes from dsgnselo.com; nothing here is authored.
import raw from './catalog.json'

export type MediaId = number

export interface Media {
  id: MediaId
  w: number
  h: number
  /** dominant colour, used as placeholder while the image loads */
  tone: string
  /** average colour of the photograph's border, for frames that show it whole */
  edge?: string
  /** where the piece sits in the photograph (0–1), for crops that must keep it in frame */
  focus?: [number, number]
  caption?: string
}

export interface Spec {
  label: string
  value: string
}

export interface Product {
  slug: string
  collection: string
  name: string
  image: MediaId | null
  thumb: MediaId | null
  specs: Spec[]
  gallery: MediaId[]
}

export interface Collection {
  slug: string
  name: string
  letter: string
  thumb: MediaId | null
  cover: MediaId | null
  text: string[]
  gallery: MediaId[]
  products: Product[]
  designers: string[]
}

export interface Designer {
  slug: string
  name: string
  role?: string
  text: string[]
  image: MediaId | null
}

interface Catalog {
  importedAt: string
  studio: {
    homeImage: MediaId
    about: ({ kind: 'text'; blocks: string[] } | { kind: 'image'; image: MediaId })[]
  }
  pages: {
    contact: { blocks: { title: string; paragraphs: string[] }[]; map: MediaId | null }
    awards: MediaId[]
    /** designers with a public page on dsgnselo.com */
    designers: string[]
  }
  collections: Collection[]
  designers: Designer[]
  media: Record<string, Media>
}

export const catalog = raw as unknown as Catalog

export const collections = catalog.collections

export function getCollection(slug: string) {
  return collections.find((c) => c.slug === slug)
}

export function getProduct(collectionSlug: string, productSlug: string) {
  return getCollection(collectionSlug)?.products.find((p) => p.slug === productSlug)
}

export function getMedia(id: MediaId | null | undefined): Media | undefined {
  return id == null ? undefined : catalog.media[id]
}

export type MediaSize = 's' | 'l'

export function mediaUrl(id: MediaId, size: MediaSize = 'l') {
  return `/assets/media/${id}/${size}.webp`
}

/** object-position that keeps the piece in view when a frame crops the photograph */
export function focusPosition(m: Media): string | undefined {
  return m.focus ? `${(m.focus[0] * 100).toFixed(1)}% ${(m.focus[1] * 100).toFixed(1)}%` : undefined
}
