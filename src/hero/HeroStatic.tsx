import { Link } from 'react-router-dom'
import { Wordmark } from '../components/Wordmark'
import { HERO_IMAGES } from './sequence'
import './hero.css'

/**
 * Still opening, chosen by the visitor ("Reduzir movimento") or used when rendering fails:
 * the same photographs and words, composed as still frames, no scroll-driven motion.
 */
export function HeroStatic({ onEnableMotion }: { onEnableMotion?: () => void }) {
  const { parede, pendentes } = HERO_IMAGES
  return (
    <section className="hero-static" aria-labelledby="hero-title">
      <h1 id="hero-title" className="visually-hidden">
        dsgnselo — estúdio de criação e marca brasileira de design de luminárias autorais
      </h1>
      <figure className="hero-static__frame hero-static__frame--dark">
        <img
          src={parede.src.m}
          srcSet={`${parede.src.m} 2200w, ${parede.src.l} 3440w`}
          sizes="100vw"
          width={parede.w}
          height={parede.h}
          alt={parede.alt}
          fetchPriority="high"
        />
        <figcaption>
          <p className="hero__line">Quando apagada, permanece como objeto escultórico.</p>
          <p className="hero__line">Quando acesa, organiza a luz no espaço.</p>
          <p className="hero__display">Luz e forma <em>coexistem.</em></p>
        </figcaption>
      </figure>
      <figure className="hero-static__frame">
        <img
          src={pendentes.src.m}
          srcSet={`${pendentes.src.m} 2200w, ${pendentes.src.l} 3440w`}
          sizes="100vw"
          width={pendentes.w}
          height={pendentes.h}
          alt={pendentes.alt}
          loading="lazy"
        />
        <figcaption>
          <blockquote className="hero__quote"><p>Somos, antes de tudo, pesquisadores da&nbsp;luz.</p></blockquote>
        </figcaption>
      </figure>
      {onEnableMotion && (
        <button type="button" className="hero-static__motion" onClick={onEnableMotion}>
          Ver abertura animada
        </button>
      )}
      <div className="hero-static__signature">
        <Wordmark className="hero__wordmark" />
        <p className="hero__claim">Estúdio de criação e marca brasileira de design de luminárias autorais.</p>
        <p className="hero__credit">
          <Link to="/colecoes/contrapeso">Coleção Contrapeso</Link>
          <span aria-hidden="true"> · </span>
          <span>design Alberth Murta</span>
        </p>
      </div>
    </section>
  )
}
