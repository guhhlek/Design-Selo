import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { catalog, collections, getCollection, getMedia, type Media } from '../data/catalog'
import { collectionImage, designerNames, pieceCount, typologiesOf, typologyLabel } from '../data/derive'
import { Picture } from '../components/Picture'
import { Lightbox } from '../components/Lightbox'
import { composeGallery } from '../components/gallery-layout'
import { ProductPlate } from '../components/ProductPlate'
import { Reveal } from '../components/Reveal'
import { useMediaQuery } from '../lib/useMediaQuery'
import { RESELLERS_URL, whatsappLink } from '../lib/contact'
import './collection-page.css'

const pad = (n: number) => String(n).padStart(2, '0')

export function CollectionPage() {
  const { slug = '' } = useParams()
  const collection = getCollection(slug)
  const [viewing, setViewing] = useState<number | null>(null)
  // how many photographs a row holds depends on the screen; the rows always fill it
  const desktop = useMediaQuery('(min-width: 1024px)')
  const tablet = useMediaQuery('(min-width: 640px)')
  const galleryOptions = desktop ? { target: 2.5, maxPerRow: 4 } : tablet ? { target: 1.9, maxPerRow: 3 } : { target: 1.25, maxPerRow: 2 }

  const gallery = useMemo(() => {
    if (!collection) return [] as Media[]
    const ids = [...new Set(collection.gallery)].filter((id) => id !== collection.cover)
    return ids.map((id) => getMedia(id)).filter((m): m is Media => !!m)
  }, [collection])

  if (!collection) {
    return (
      <main className="cpage cpage--missing" id="conteudo">
        <p className="cpage__missing">Coleção não encontrada.</p>
        <Link to="/#colecoes" className="link-underline">Ver todas as coleções</Link>
      </main>
    )
  }

  const index = collections.indexOf(collection)
  const next = collections[(index + 1) % collections.length]
  const cover = getMedia(collection.cover) ?? collectionImage(collection)
  const nextImage = getMedia(next.cover) ?? collectionImage(next)
  const designers = designerNames(collection)
  const people = collection.designers
    .map((s) => catalog.designers.find((d) => d.slug === s))
    .filter((d): d is NonNullable<typeof d> => !!d)
  // a short opening paragraph is set as the statement; a long one gives only its first sentence
  const [first = '', ...restParagraphs] = collection.text
  const sentence = first.match(/^(.+?[.!?])\s+(.+)$/s)
  const split = first.length > 220 && sentence
  const statement = split ? sentence[1] : first
  const body = split ? [sentence[2], ...restParagraphs] : restParagraphs
  const rows = composeGallery(gallery, galleryOptions)
  // the cover opens the viewer too, as photograph 01
  const viewerItems = cover ? [cover, ...gallery] : gallery
  const offset = cover ? 1 : 0

  return (
    <main className="cpage" id="conteudo" key={collection.slug}>
      {/* 1 — opening */}
      <header className="cpage__hero">
        <div className="cpage__hero-text">
          <p className="cpage__eyebrow eyebrow">
            <Link to="/#colecoes">Coleções</Link>
            <span aria-hidden="true">/</span>
            <span>{pad(index + 1)} — {pad(collections.length)}</span>
          </p>
          <h1 className="cpage__title">{collection.name}</h1>
          <dl className="cpage__facts">
            {designers.length > 0 && (
              <div><dt>Design</dt><dd>{designers.join(', ')}</dd></div>
            )}
            <div><dt>Peças</dt><dd>{pieceCount(collection.products.length)}</dd></div>
            <div><dt>Tipologias</dt><dd>{typologiesOf(collection).map(typologyLabel).join(' · ') || '—'}</dd></div>
          </dl>
        </div>
        {cover && (
          <button type="button" className="cpage__cover" onClick={() => setViewing(0)} aria-label={`Ampliar imagem de capa da coleção ${collection.name}`}>
            <Picture media={cover} alt={cover.caption ?? `Coleção ${collection.name}`} sizes="(min-width: 1024px) 58vw, 100vw" priority />
          </button>
        )}
      </header>

      {/* 2 — concept */}
      {statement && (
        <Reveal as="section" className="cpage__concept">
          <p className="cpage__statement">{statement}</p>
          {body.length > 0 && (
            <div className="cpage__body">
              {body.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
        </Reveal>
      )}

      {/* 3 — gallery: justified rows, every photograph whole and every row full */}
      {rows.length > 0 && (
        <section className="cpage__gallery" aria-label={`Galeria da coleção ${collection.name}`}>
          {rows.map((row, r) => {
            const start = rows.slice(0, r).reduce((n, x) => n + x.items.length, 0)
            return (
              <Reveal
                key={`${r}-${row.items[0].id}`}
                className={`gallery-row ${r % 2 ? 'gallery-row--dense' : 'gallery-row--tall'}`}
              >
                <div className="gallery-row__inner" style={{ '--s': row.ratio } as CSSProperties}>
                  {row.items.map((m, k) => (
                    <button
                      key={m.id}
                      type="button"
                      className="gallery-row__item"
                      onClick={() => setViewing(offset + start + k)}
                      aria-label={`Ampliar imagem ${start + k + 1} de ${gallery.length}`}
                      style={{ '--r': m.w / m.h, '--k': k } as CSSProperties}
                    >
                      <Picture
                        media={m}
                        alt={m.caption ?? `${collection.name}, imagem ${start + k + 1}`}
                        sizes={`${Math.round((100 * (m.w / m.h)) / row.ratio)}vw`}
                      />
                    </button>
                  ))}
                </div>
              </Reveal>
            )
          })}
        </section>
      )}

      {/* 4 — pieces */}
      <section className="cpage__pieces" aria-labelledby="pecas">
        <header className="cpage__section-head">
          <h2 id="pecas" className="cpage__h2">Peças</h2>
          <p className="eyebrow">{pieceCount(collection.products.length)}</p>
        </header>
        <ul className="cpage__plates">
          {collection.products.map((p, i) => (
            <li key={p.slug} style={{ '--i': i } as CSSProperties}>
              <ProductPlate product={p} />
            </li>
          ))}
        </ul>
      </section>

      {/* 5 — designers */}
      {people.length > 0 && (
        <Reveal as="section" className="cpage__people">
          <h2 className="eyebrow">Design</h2>
          <ul>
            {people.map((d) => {
              const portrait = getMedia(d.image)
              const name = designerNames({ ...collection, designers: [d.slug] })[0]
              return (
                <li key={d.slug} className="cpage__person">
                  {portrait && <Picture media={portrait} alt={`Retrato de ${name}`} sizes="160px" className="cpage__portrait" />}
                  <div>
                    <p className="cpage__person-name">{name}</p>
                    {d.role && <p className="cpage__person-role">{d.role}</p>}
                    {d.text[0] && <blockquote className="cpage__person-quote">{d.text[0]}</blockquote>}
                  </div>
                </li>
              )
            })}
          </ul>
        </Reveal>
      )}

      {/* 6 — enquiry */}
      <Reveal as="section" className="cpage__enquiry">
        <p className="cpage__enquiry-title">Especificar {collection.name}</p>
        <p className="cpage__enquiry-text">
          Disponibilidade, especificações e atendimento para o seu projeto, diretamente com o estúdio.
        </p>
        <div className="cpage__enquiry-actions">
          <a className="button button--solid" href={whatsappLink(`Olá! Gostaria de saber mais sobre a coleção ${collection.name}.`)} target="_blank" rel="noreferrer">
            Consultar pelo WhatsApp
          </a>
          <a className="button" href={RESELLERS_URL} target="_blank" rel="noreferrer">Encontre uma revenda</a>
        </div>
      </Reveal>

      {/* 7 — next collection */}
      <Link to={`/colecoes/${next.slug}`} className="cpage__next">
        <span className="cpage__next-label eyebrow">Próxima coleção · {pad(collections.indexOf(next) + 1)}</span>
        <span className="cpage__next-name">{next.name}</span>
        {nextImage && (
          <span className="cpage__next-image" aria-hidden="true">
            <Picture media={nextImage} alt="" sizes="40vw" />
          </span>
        )}
      </Link>

      <Lightbox
        items={viewerItems}
        index={viewing}
        title={`Coleção ${collection.name}`}
        onClose={() => setViewing(null)}
        onIndex={setViewing}
      />
    </main>
  )
}
