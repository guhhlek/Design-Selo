// Facts derived from the imported catalogue (never authored): typologies come from
// the real product names, images fall back to a product photograph when a
// collection has none of its own.
import { catalog, getMedia, type Collection, type Media, type Product } from './catalog'

export const TYPOLOGIES = [
  { id: 'pendente', label: 'Pendente', plural: 'Pendentes', match: /pendente/i },
  { id: 'parede', label: 'Parede', plural: 'Parede', match: /parede/i },
  { id: 'piso', label: 'Piso', plural: 'Piso', match: /piso/i },
  { id: 'mesa', label: 'Mesa', plural: 'Mesa', match: /mesa/i },
  { id: 'teto', label: 'Teto', plural: 'Teto', match: /teto|projetor/i },
] as const

export type TypologyId = (typeof TYPOLOGIES)[number]['id']

const typologyCache = new Map<string, TypologyId[]>()

/** typologies present in a collection, in canonical order */
export function typologiesOf(c: Collection): TypologyId[] {
  let t = typologyCache.get(c.slug)
  if (!t) {
    t = TYPOLOGIES.filter((ty) => c.products.some((p) => ty.match.test(p.name) || ty.match.test(p.slug))).map((ty) => ty.id)
    typologyCache.set(c.slug, t)
  }
  return t
}

export function typologyLabel(id: TypologyId) {
  return TYPOLOGIES.find((t) => t.id === id)!.label
}

/** the collection's own image, or its first product photograph */
export function collectionImage(c: Collection): Media | undefined {
  return (
    getMedia(c.thumb) ??
    getMedia(c.cover) ??
    getMedia(c.products.find((p) => p.image ?? p.thumb)?.image ?? c.products.find((p) => p.thumb)?.thumb)
  )
}

/** designer names as people read them ("ARI COELHO" → "Ari Coelho") */
export function designerNames(c: Collection): string[] {
  return c.designers
    .map((slug) => catalog.designers.find((d) => d.slug === slug)?.name)
    .filter((n): n is string => !!n)
    .map((n) => n.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase()))
}

/** first sentence of the collection's own text, for previews */
export function leadSentence(c: Collection): string | undefined {
  const first = c.text[0]
  if (!first) return undefined
  const m = first.match(/^(.+?[.!?])(\s|$)/)
  return (m ? m[1] : first).trim()
}

export function pieceCount(n: number) {
  return `${n} ${n === 1 ? 'peça' : 'peças'}`
}

/** first value recorded under a spec label (product texts sometimes repeat a label in English) */
export function specOf(p: Product, label: string): string | undefined {
  return p.specs.find((s) => s.label === label)?.value
}

/** specs with duplicate labels dropped, in their published order */
export function uniqueSpecs(p: Product) {
  const seen = new Set<string>()
  return p.specs.filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)))
}

export function typologyOfProduct(p: Product): string | undefined {
  return TYPOLOGIES.find((t) => t.match.test(p.name) || t.match.test(p.slug))?.label
}
