import { contact, telHref } from '../data/contact'
import { whatsappLink, RESELLERS_URL } from '../lib/contact'
import { PageHead } from '../components/PageHead'
import { Reveal } from '../components/Reveal'
import { ShowroomMap } from '../components/ShowroomMap'
import './institutional.css'

/** dsgnselo.com/contato: showroom, commercial channels and networks, as published. */
export function ContatoPage() {
  return (
    <main className="ipage" id="conteudo">
      <PageHead
        eyebrow="Contato"
        title={<>Showroom <em>e atendimento.</em></>}
        intro={<p>Visite as peças em Curitiba ou fale com o atendimento comercial da dsgnselo.</p>}
        actions={
          <>
            <a className="button button--solid" href={whatsappLink('Olá! Gostaria de falar com o estúdio dsgnselo.')} target="_blank" rel="noreferrer">
              Falar pelo WhatsApp
            </a>
            <a className="button" href={RESELLERS_URL} target="_blank" rel="noreferrer">Encontre uma revenda</a>
          </>
        }
      />

      <Reveal as="section" className="contact__map">
        <ShowroomMap />
      </Reveal>

      <Reveal as="section" className="contact">
        <div className="contact__block">
          <p className="contact__heading">{contact.showroom.label}</p>
          <address className="contact__address">
            {contact.showroom.lines.map((l) => <span key={l}>{l}</span>)}
          </address>
          {contact.showroom.phone && <a className="contact__line" href={telHref(contact.showroom.phone)}>{contact.showroom.phone}</a>}
        </div>

        {contact.channels.map((c) => (
          <div key={c.label} className="contact__block">
            <p className="contact__heading">{c.label === 'Geral' ? 'Atendimento geral' : c.label}</p>
            {c.email && <a className="contact__email" href={`mailto:${c.email}`}>{c.email}</a>}
            {c.phone && <a className="contact__line" href={telHref(c.phone)}>{c.phone}</a>}
          </div>
        ))}
      </Reveal>

      <Reveal as="section" className="contact__social">
        <p className="contact__heading">Acompanhe</p>
        <ul>
          {contact.social.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}<span aria-hidden="true">↗</span></a></li>
          ))}
        </ul>
      </Reveal>
    </main>
  )
}
