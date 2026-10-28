import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { collections, focusPosition, mediaUrl } from '../data/catalog'
import {
  collectionImage, designerNames, leadSentence, pieceCount, TYPOLOGIES, typologiesOf, typologyLabel, type TypologyId,
} from '../data/derive'
import './collections-index.css'

const num = (i: number) => String(i + 1).padStart(2, '0')

/** Warms the browser cache so the plate can reveal a decoded image. */
function prime(src: string) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  return img.decode().catch(() => undefined)
}

/**
 * The 21 collections as the contents page of an exhibition catalogue.
 * Desktop: an editorial table on the left; a sticky plate on the right answers
 * hover and keyboard focus with the collection's photograph and its own words.
 * Touch: each row carries its own portrait plate.
 */
export function CollectionsIndex() {
  const [filter, setFilter] = useState<TypologyId | 'all'>('all')
  const [active, setActive] = useState('contrapeso')
  // plate layers: the previous image stays beneath while the next one is revealed
  const [layers, setLayers] = useState<{ slug: string; key: number }[]>([{ slug: 'contrapeso', key: 0 }])
  const pending = useRef<string | null>(null)
  const keySeq = useRef(1)
  const sectionRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const [inView, setInView] = useState(false)

  const list = useMemo(
    () => collections.filter((c) => filter === 'all' || typologiesOf(c).includes(filter)),
    [filter],
  )
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: collections.length }
    for (const t of TYPOLOGIES) out[t.id] = collections.filter((c) => typologiesOf(c).includes(t.id)).length
    return out
  }, [])

  const current = collections.find((c) => c.slug === active) ?? collections[0]

  const show = (slug: string) => {
    if (slug === active || slug === pending.current) return
    pending.current = slug
    setActive(slug)
    const c = collections.find((x) => x.slug === slug)
    const m = c && collectionImage(c)
    // reveal once decoded (or after a short wait, so the plate never feels stuck)
    Promise.race([m ? prime(mediaUrl(m.id, 'l')) : Promise.resolve(), new Promise((r) => setTimeout(r, 220))]).then(() => {
      if (pending.current !== slug) return
      pending.current = null
      setLayers((ls) => [...ls.slice(-1), { slug, key: keySeq.current++ }])
    })
  }

  // the entrance plays when the section arrives, not while it is still off screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: 0.08 })
    io.observe(sectionRef.current!)
    return () => io.disconnect()
  }, [])

  // touch screens have no hover: the row crossing the middle of the screen becomes active
  useEffect(() => {
    if (window.matchMedia('(hover: hover) and (min-width: 1024px)').matches) return
    const rows = listRef.current!.querySelectorAll<HTMLElement>('[data-slug]')
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.getAttribute('data-slug')!)),
      { rootMargin: '-48% 0px -48% 0px' },
    )
    rows.forEach((r) => io.observe(r))
    return () => io.disconnect()
  }, [list])

  // if the active collection is filtered out, move to the first visible one
  useEffect(() => {
    if (list.length && !list.some((c) => c.slug === active)) show(list[0].slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list])

  return (
    <section ref={sectionRef} id="colecoes" className="cindex" aria-labelledby="cindex-title" data-inview={inView || undefined}>
      <header className="cindex__head">
        <p className="cindex__eyebrow eyebrow">Índice</p>
        <h2 id="cindex-title" className="cindex__title">
          Coleções<sup>{collections.length}</sup>
        </h2>
        <p className="cindex__intro">
          Mais do que produtos, criamos experiências: esculturas de luz capazes de transformar
          ambientes e provocar novas formas de perceber o espaço.
        </p>
        <div className="cindex__filters" role="group" aria-label="Filtrar por tipologia">
          {([{ id: 'all', plural: 'Todas' }, ...TYPOLOGIES] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              className="cindex__filter"
              aria-pressed={filter === t.id}
              onClick={() => setFilter(t.id)}
            >
              {t.plural}<span>{counts[t.id]}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="cindex__body">
        <ol ref={listRef} className="cindex__list" aria-label="Coleções">
          {list.map((c, i) => {
            const m = collectionImage(c)
            const index = collections.indexOf(c)
            return (
              <li key={c.slug} style={{ '--i': i } as CSSProperties}>
                <Link
                  to={`/colecoes/${c.slug}`}
                  className="cindex__row"
                  data-slug={c.slug}
                  data-active={c.slug === active || undefined}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && show(c.slug)}
                  onFocus={() => show(c.slug)}
                >
                  <span className="cindex__num">{num(index)}</span>
                  <span className="cindex__name">
                    <span className="cindex__light" aria-hidden="true" />
                    {c.name}
                  </span>
                  <span className="cindex__types">{typologiesOf(c).map(typologyLabel).join(' · ')}</span>
                  <span className="cindex__count">{pieceCount(c.products.length)}</span>
                  {m && (
                    <img
                      className="cindex__thumb"
                      src={mediaUrl(m.id, 's')}
                      width={m.w}
                      height={m.h}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{ backgroundColor: m.tone, objectPosition: focusPosition(m) }}
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ol>

        <aside className="cindex__aside" aria-hidden="true">
          <Link to={`/colecoes/${current.slug}`} className="cindex__plate" tabIndex={-1}>
            {layers.map(({ slug, key }) => {
              const c = collections.find((x) => x.slug === slug)!
              const m = collectionImage(c)
              return (
                <span key={key} className="cindex__layer">
                  {m && (
                    <img
                      src={mediaUrl(m.id, 's')}
                      srcSet={`${mediaUrl(m.id, 's')} 900w, ${mediaUrl(m.id, 'l')} 2000w`}
                      sizes="(min-width: 1024px) 38vw, 100vw"
                      alt=""
                      style={{ backgroundColor: m.tone, objectPosition: focusPosition(m) }}
                    />
                  )}
                </span>
              )
            })}
            <span className="cindex__plate-num">{num(collections.indexOf(current))}</span>
          </Link>
          <div className="cindex__caption" key={current.slug}>
            <p className="cindex__caption-name">{current.name}</p>
            {leadSentence(current) && <p className="cindex__caption-lead">{leadSentence(current)}</p>}
            <p className="cindex__caption-meta">
              {designerNames(current).length > 0 && <span>Design {designerNames(current).join(', ')}</span>}
              <span>{pieceCount(current.products.length)}</span>
            </p>
            <Link to={`/colecoes/${current.slug}`} className="cindex__caption-link" tabIndex={-1}>
              Ver coleção <span aria-hidden="true">→</span>
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}
