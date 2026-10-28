import { Link } from 'react-router-dom'
import { catalog, getMedia } from '../data/catalog'
import { awards, awardTitle } from '../data/awards'
import { Picture } from '../components/Picture'
import { Reveal } from '../components/Reveal'
import './about-teaser.css'

/** After the collections: who the studio is (its own words) and its most recent recognition. */
export function AboutTeaser() {
  const about = catalog.studio.about
  const at = about.findIndex((b) => b.kind === 'text' && /estúdio/i.test(b.blocks[0]))
  const studio = about[at]
  // the photograph set before "Nosso estúdio" on the original page
  const imageBlock = about[at - 1]
  const image = imageBlock?.kind === 'image' ? getMedia(imageBlock.image) : undefined
  const lead = studio?.kind === 'text' ? studio.blocks[1] : undefined
  // the most recent award won, else the most recent recognition
  const latest = awards.find((a) => a.distinction === 'Vencedor') ?? awards[0]

  return (
    <Reveal as="section" className="teaser">
      {image && (
        <figure className="teaser__image">
          <Picture media={image} alt="O estúdio dsgnselo" sizes="(min-width: 1024px) 34vw, 100vw" />
        </figure>
      )}
      <div className="teaser__text">
        <p className="eyebrow teaser__eyebrow">Sobre</p>
        <p className="teaser__title">Somos, antes de tudo, pesquisadores da&nbsp;luz.</p>
        {lead && <p className="teaser__lead">{lead}</p>}
        <Link to="/sobre" className="button">Conheça o estúdio</Link>
        {latest && (
          <Link to="/premios" className="teaser__award">
            <span className="eyebrow">{awardTitle(latest)}</span>
            <span className="teaser__award-text">{latest.distinction} — {latest.piece}</span>
            <span className="teaser__award-more">Ver todos os prêmios →</span>
          </Link>
        )}
      </div>
    </Reveal>
  )
}
