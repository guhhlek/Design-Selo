import { HeroSequence } from '../hero/HeroSequence'
import { CollectionsIndex } from '../sections/CollectionsIndex'
import { AboutTeaser } from '../sections/AboutTeaser'

export function Home() {
  return (
    <>
      <HeroSequence />
      <div id="conteudo">
        <CollectionsIndex />
        <AboutTeaser />
      </div>
    </>
  )
}
