import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { catalog, collections, getCollection, getMedia, type Media } from '../data/catalog'
import { awards } from '../data/awards'
import { collectionImage } from '../data/derive'
import { Picture } from '../components/Picture'
import { Reveal } from '../components/Reveal'
import { PageHead } from '../components/PageHead'
import './institutional.css'

interface Chapter {
  title: string
  lead?: string
  body: string[]
  image?: Media
}

/** dsgnselo.com/sobre, verbatim: three texts and their photographs, set as a publication. */
export function SobrePage() {
  const about = catalog.studio.about
  // each text is paired with the photograph that precedes it on the original page
  const chapters: Chapter[] = about.flatMap((block, i) => {
    if (block.kind !== 'text') return []
    const prev = about[i - 1]
    const [title, lead, ...body] = block.blocks
    return [{ title, lead, body, image: prev?.kind === 'image' ? getMedia(prev.image) : undefined }]
  })
  const [whoWeAre, ...rest] = chapters
  const studio = rest.find((c) => /estúdio/i.test(c.title))
  // the sentence the studio text closes on, set as the page's interlude
  const interlude = studio?.body.join(' ').match(/Transformamos a iluminação em presença, linguagem e arte/)?.[0]
  const pieces = collections.reduce((n, c) => n + c.products.length, 0)

  const designer = getMedia(catalog.designers.find((d) => catalog.pages.designers.includes(d.slug))?.image)
  const certificate = getMedia(awards[0]?.media)
  const contrapeso = getCollection('contrapeso')
  const collectionCover = contrapeso && collectionImage(contrapeso)

  return (
    <main className="ipage" id="conteudo">
      <PageHead
        eyebrow="Sobre a dsgnselo"
        title={<>Pesquisadores <em>da luz.</em></>}
        intro={whoWeAre?.lead && <p>{whoWeAre.lead}</p>}
      />

      {whoWeAre?.image && (
        <figure className="ipage__wide">
          <Picture media={whoWeAre.image} alt="Luminárias dsgnselo em um espaço expositivo" sizes="100vw" priority />
        </figure>
      )}

      <Reveal as="section" className="facts" >
        <dl>
          <div><dd>{collections.length}</dd><dt>Coleções autorais</dt></div>
          <div><dd>{pieces}</dd><dt>Peças no catálogo</dt></div>
          <div><dd>{awards.length}</dd><dt>Prêmios e seleções</dt></div>
          <div><dd>Curitiba</dd><dt>Showroom</dt></div>
        </dl>
      </Reveal>

      {rest.map((ch, i) => (
        <div key={ch.title}>
          <Reveal as="section" className={`chapter ${i % 2 ? 'chapter--flip' : ''}`}>
            {ch.image && (
              <figure
                className={`chapter__image ${ch.image.w / ch.image.h > 1.15 ? 'chapter__image--wide' : ''}`}
                style={{ '--r': ch.image.w / ch.image.h } as CSSProperties}
              >
                <Picture media={ch.image} alt={ch.title} sizes="(min-width: 1024px) 44vw, 100vw" />
              </figure>
            )}
            <div className="chapter__text">
              <p className="chapter__num">{String(i + 1).padStart(2, '0')}</p>
              <h2 className="chapter__title">{ch.title}</h2>
              {ch.lead && <p className="chapter__lead">{ch.lead}</p>}
              {ch.body.map((p, k) => <p key={k} className="chapter__body">{p}</p>)}
            </div>
          </Reveal>
          {ch === studio && interlude && (
            <Reveal as="section" className="interlude">
              <p className="interlude__eyebrow">Nosso estúdio</p>
              <blockquote className="interlude__quote">{interlude}.</blockquote>
            </Reveal>
          )}
        </div>
      ))}

      <Reveal as="section" className="onward">
        <p className="onward__eyebrow">Continue</p>
        <ul className="onward__list">
          {[
            { to: '/designers', label: 'Designers', note: 'Quem assina as coleções', media: designer },
            { to: '/premios', label: 'Prêmios', note: 'Reconhecimento', media: certificate },
            { to: '/#colecoes', label: 'Coleções', note: `${collections.length} coleções`, media: collectionCover },
          ].map((card) => (
            <li key={card.to}>
              <Link to={card.to} className="onward__card">
                <span className="onward__image">
                  {card.media && <Picture media={card.media} alt="" sizes="(min-width: 1024px) 30vw, 100vw" />}
                </span>
                <span className="onward__note">{card.note}</span>
                <span className="onward__label">{card.label} <span aria-hidden="true">→</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </main>
  )
}
