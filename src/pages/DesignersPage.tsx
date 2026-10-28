import { Link } from 'react-router-dom'
import { catalog, collections, getMedia } from '../data/catalog'
import { collectionImage } from '../data/derive'
import { Picture } from '../components/Picture'
import { Reveal } from '../components/Reveal'
import { PageHead } from '../components/PageHead'
import './institutional.css'

const titleCase = (n: string) => n.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase())

/**
 * dsgnselo.com/designers lists one profile (Alberth Murta). The other names are
 * credited on collections; their profile pages are not published, so they appear
 * with the collections they sign and nothing more.
 */
export function DesignersPage() {
  const people = catalog.designers.map((d) => ({
    ...d,
    name: titleCase(d.name),
    portrait: getMedia(d.image),
    signed: collections.filter((c) => c.designers.includes(d.slug)),
    featured: catalog.pages.designers.includes(d.slug),
  }))
  const featured = people.filter((p) => p.featured)
  const collaborators = people.filter((p) => !p.featured && p.signed.length > 0)

  return (
    <main className="ipage" id="conteudo">
      <PageHead
        eyebrow="Autoria"
        title="Designers"
        intro={featured[0] && (
          <p>
            {featured[0].name} assina {featured[0].signed.length} das {collections.length} coleções
            {collaborators.length > 0 && <>, com colaborações de {collaborators.map((c) => c.name).join(' e ')}</>}.
          </p>
        )}
      />

      {featured.map((d) => (
        <Reveal as="section" key={d.slug} className="designer">
          {d.portrait && (
            <figure className="designer__portrait">
              <Picture media={d.portrait} alt={`Retrato de ${d.name}`} sizes="(min-width: 1024px) 34vw, 100vw" priority />
            </figure>
          )}
          <div className="designer__text">
            <h2 className="designer__name">{d.name}</h2>
            {d.role && <p className="designer__role">{d.role}</p>}
            {d.text[0] && <blockquote className="designer__quote">{d.text[0]}</blockquote>}
            <div className="designer__signed">
              <p className="eyebrow">{d.signed.length} coleções</p>
              <ul>
                {d.signed.map((c) => {
                  const m = collectionImage(c)
                  return (
                    <li key={c.slug}>
                      <Link to={`/colecoes/${c.slug}`} className="signed">
                        {m && <Picture media={m} alt="" sizes="56px" className="signed__thumb" />}
                        <span>{c.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </Reveal>
      ))}

      {collaborators.length > 0 && (
        <Reveal as="section" className="collab">
          <h2 className="collab__title">Colaborações</h2>
          <ul className="collab__list">
            {collaborators.map((d) => (
              <li key={d.slug} className="collab__row">
                {d.portrait ? (
                  <Picture media={d.portrait} alt={`Retrato de ${d.name}`} sizes="96px" className="collab__portrait" />
                ) : (
                  <span className="collab__portrait collab__portrait--empty" aria-hidden="true">{d.name[0]}</span>
                )}
                <p className="collab__name">{d.name}</p>
                <p className="collab__collections">
                  {d.signed.map((c, i) => (
                    <span key={c.slug}>
                      <Link to={`/colecoes/${c.slug}`}>{c.name}</Link>
                      {i < d.signed.length - 1 && <span aria-hidden="true"> · </span>}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </main>
  )
}
