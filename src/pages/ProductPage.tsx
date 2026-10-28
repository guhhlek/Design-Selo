import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCollection, getMedia, getProduct, mediaUrl, type Media } from '../data/catalog'
import { designerNames, typologyOfProduct, uniqueSpecs } from '../data/derive'
import { Picture } from '../components/Picture'
import { Lightbox } from '../components/Lightbox'
import { ProductPlate } from '../components/ProductPlate'
import { RESELLERS_URL, whatsappLink } from '../lib/contact'
import './product-page.css'

/** "Dimensão" values are "L x A x P mm"; set them with proper multiplication signs */
const formatValue = (label: string, v: string) => (label === 'Dimensão' ? v.replace(/\s*x\s*/gi, ' × ') : v)

export function ProductPage() {
  const { slug = '', product: productSlug = '' } = useParams()
  const collection = getCollection(slug)
  const product = getProduct(slug, productSlug)
  const [current, setCurrent] = useState(0)
  const [viewing, setViewing] = useState<number | null>(null)

  const images = useMemo(() => {
    if (!product) return [] as Media[]
    const ids = [...new Set([product.image, ...product.gallery, product.thumb].filter((x): x is number => x != null))]
    return ids.map((id) => getMedia(id)).filter((m): m is Media => !!m)
  }, [product])

  if (!collection || !product) {
    return (
      <main className="ppage ppage--missing" id="conteudo">
        <p>Peça não encontrada.</p>
        <Link to={collection ? `/colecoes/${collection.slug}` : '/#colecoes'} className="link-underline">Voltar</Link>
      </main>
    )
  }

  const specs = uniqueSpecs(product)
  const description = specs.find((s) => s.label === 'Descrição')?.value ?? specs.find((s) => !s.label)?.value
  const table = specs.filter((s) => s.label && s.label !== 'Descrição')
  const typology = typologyOfProduct(product)
  const designers = designerNames(collection)
  const others = collection.products.filter((p) => p.slug !== product.slug)
  const main = images[current]
  const code = table.find((s) => s.label === 'Código')?.value.split('\n')[0]

  return (
    <main className="ppage" id="conteudo" key={product.slug}>
      <div className="ppage__layout">
        {/* the piece */}
        <section className="ppage__media" aria-label={`Imagens de ${product.name}`}>
          {main ? (
            <button
              type="button"
              className="ppage__main"
              onClick={() => setViewing(current)}
              aria-label="Ampliar imagem"
              style={{ '--r': main.w / main.h, backgroundColor: main.edge ?? main.tone } as CSSProperties}
            >
              <span className="ppage__main-frame" key={main.id} style={{ backgroundColor: main.edge ?? main.tone }}>
                <Picture media={main} alt={`${collection.name} ${product.name}`} sizes="(min-width: 1024px) 56vw, 100vw" priority />
              </span>
              <span className="ppage__zoom" aria-hidden="true">Ampliar</span>
            </button>
          ) : (
            <div className="ppage__main ppage__main--empty"><p>Imagem não disponível</p></div>
          )}
          {images.length > 1 && (
            <ul className="ppage__thumbs" aria-label="Escolher imagem">
              {images.map((m, i) => (
                <li key={m.id}>
                  <button
                    type="button"
                    aria-label={`Imagem ${i + 1}`}
                    aria-pressed={i === current}
                    onClick={() => setCurrent(i)}
                    onPointerEnter={() => { const img = new Image(); img.src = mediaUrl(m.id, 'l') }}
                  >
                    <Picture media={m} alt="" sizes="96px" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* the sheet */}
        <aside className="ppage__sheet">
          <p className="ppage__crumbs eyebrow">
            <Link to="/#colecoes">Coleções</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/colecoes/${collection.slug}`}>{collection.name}</Link>
          </p>
          <h1 className="ppage__title">
            <span className="ppage__title-collection">{collection.name}</span>
            {product.name}
          </h1>
          {description && <p className="ppage__description">{description}</p>}

          <dl className="ppage__specs">
            {typology && (
              <div><dt>Tipologia</dt><dd>{typology}</dd></div>
            )}
            {table.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{formatValue(s.label, s.value).split('\n').map((line, i) => <span key={i}>{line}</span>)}</dd>
              </div>
            ))}
            {designers.length > 0 && (
              <div><dt>Design</dt><dd>{designers.join(', ')}</dd></div>
            )}
          </dl>

          <div className="ppage__actions">
            <a
              className="button button--solid"
              href={whatsappLink(`Olá! Gostaria de saber mais sobre a peça ${collection.name} ${product.name}${code ? ` (${code})` : ''}.`)}
              target="_blank"
              rel="noreferrer"
            >
              Consultar esta peça
            </a>
            <a className="button" href={RESELLERS_URL} target="_blank" rel="noreferrer">Encontre uma revenda</a>
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="ppage__others" aria-labelledby="outras">
          <header className="ppage__others-head">
            <h2 id="outras" className="ppage__h2">Outras peças de {collection.name}</h2>
            <Link to={`/colecoes/${collection.slug}`} className="link-underline eyebrow">Ver a coleção</Link>
          </header>
          <ul className="ppage__others-list">
            {others.map((p) => (
              <li key={p.slug}><ProductPlate product={p} sizes="(min-width: 1024px) 20vw, 60vw" /></li>
            ))}
          </ul>
        </section>
      )}

      <Lightbox
        items={images}
        index={viewing}
        title={`${collection.name} ${product.name}`}
        onClose={() => setViewing(null)}
        onIndex={(i) => { setViewing(i); setCurrent(i) }}
      />
    </main>
  )
}
