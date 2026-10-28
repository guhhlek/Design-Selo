import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMedia, type Media } from '../data/catalog'
import { awards, awardTitle } from '../data/awards'
import { Picture } from '../components/Picture'
import { Reveal } from '../components/Reveal'
import { Lightbox } from '../components/Lightbox'
import { PageHead } from '../components/PageHead'
import './institutional.css'

export function PremiosPage() {
  const [viewing, setViewing] = useState<number | null>(null)
  const certificates = useMemo(() => awards.map((a) => getMedia(a.media)).filter((m): m is Media => !!m), [])
  const programmes = new Set(awards.map((a) => a.award)).size

  return (
    <main className="ipage" id="conteudo">
      <PageHead
        eyebrow="Reconhecimento"
        title="Prêmios"
        intro={
          <p>
            {awards.length} prêmios e seleções em {programmes} premiações: o Prêmio Design Museu da Casa Brasileira
            e o LIT Lighting Design Awards.
          </p>
        }
      />

      <ol className="awards">
        {awards.map((a, i) => {
          const m = getMedia(a.media)
          return (
            <Reveal as="li" key={a.media} className="award">
              <p className="award__year">{a.year ?? `${a.edition} ed.`}</p>
              <div className="award__text">
                <p className="award__programme">{awardTitle(a)}</p>
                <p className="award__distinction">{a.distinction}</p>
                <p className="award__piece">
                  {a.collection ? <Link to={`/colecoes/${a.collection}`}>{a.piece}</Link> : a.piece}
                </p>
                <p className="award__credit">{a.credit}{a.date ? ` · ${a.date}` : ''}</p>
              </div>
              {m && (
                <button type="button" className="award__cert" onClick={() => setViewing(i)} aria-label={`Ver certificado: ${a.award} — ${a.piece}`}>
                  <Picture media={m} alt="" sizes="160px" />
                </button>
              )}
            </Reveal>
          )
        })}
      </ol>

      <Lightbox items={certificates} index={viewing} title="Prêmios dsgnselo" onClose={() => setViewing(null)} onIndex={setViewing} />
    </main>
  )
}
