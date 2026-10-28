import { Link } from 'react-router-dom'
import { contact, telHref } from '../data/contact'
import { whatsappLink } from '../lib/contact'
import { scrollToY } from '../lib/smoothScroll'
import { useInView } from '../lib/useInView'
import { Wordmark } from './Wordmark'
import { NAV } from './nav'
import './site-footer.css'

const YEAR = new Date().getFullYear()

/** the brand's own description (meta description of dsgnselo.com) */
const ABOUT = 'Marca brasileira de iluminação decorativa que utiliza o modelo industrial para produzir em escala artesanal.'

export function SiteFooter() {
  const [ref, inView] = useInView<HTMLElement>(0.15)
  const general = contact.channels.find((c) => c.label === 'Geral')
  return (
    <footer ref={ref} className="site-footer" data-inview={inView || undefined}>
      <div className="site-footer__invite">
        <p className="site-footer__invite-eyebrow">Projetos e especificação</p>
        <p className="site-footer__invite-title">
          Especifique uma peça ou desenvolva uma solução <em>sob medida.</em>
        </p>
        <div className="site-footer__invite-actions">
          <a className="button button--light" href={whatsappLink('Olá! Gostaria de falar com o estúdio dsgnselo.')} target="_blank" rel="noreferrer">
            Falar pelo WhatsApp
          </a>
          {general?.email && (
            <a className="button button--outline-light" href={`mailto:${general.email}`}>Escrever um e-mail</a>
          )}
        </div>
      </div>

      <div className="site-footer__rule" aria-hidden="true"><span /></div>

      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <Link to="/" aria-label="dsgnselo — início" className="site-footer__logo"><Wordmark /></Link>
          <p>{ABOUT}</p>
        </div>

        <nav className="site-footer__col" aria-label="Rodapé">
          <p className="site-footer__label">Navegação</p>
          <ul>
            {NAV.map((item) => <li key={item.to}><Link to={item.to}>{item.label}</Link></li>)}
          </ul>
        </nav>

        <div className="site-footer__col">
          <p className="site-footer__label">{contact.showroom.label}</p>
          <address>
            {contact.showroom.lines.map((l) => <span key={l}>{l}</span>)}
          </address>
          {contact.showroom.phone && <a href={telHref(contact.showroom.phone)}>{contact.showroom.phone}</a>}
          <Link to="/contato" className="site-footer__accent">Ver no mapa</Link>
        </div>

        <div className="site-footer__col">
          <p className="site-footer__label">Comercial</p>
          <ul className="site-footer__channels">
            {contact.channels.filter((c) => c !== general).map((c) => (
              <li key={c.label}>
                <span>{c.label.replace(/^dsgnselo\s*/i, '')}</span>
                {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                {c.phone && <a href={telHref(c.phone)}>{c.phone}</a>}
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer__col">
          <p className="site-footer__label">Redes</p>
          <ul>
            {contact.social.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer__base">
        <p>dsgnselo © {YEAR}</p>
        <p>Design e desenvolvimento de iluminação · Curitiba, Brasil</p>
        <button type="button" onClick={() => scrollToY(0)}>Voltar ao topo ↑</button>
      </div>
    </footer>
  )
}
