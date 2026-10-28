import { Link } from 'react-router-dom'
import { getMedia, type Product } from '../data/catalog'
import { specOf } from '../data/derive'
import { Picture } from './Picture'
import './product-plate.css'

/** A catalogue plate: the piece on its own ground, its name, size and code. */
export function ProductPlate({ product, sizes = '(min-width: 1024px) 24vw, 50vw' }: { product: Product; sizes?: string }) {
  const m = getMedia(product.thumb ?? product.image)
  const dimension = specOf(product, 'Dimensão')
  const code = specOf(product, 'Código')?.split('\n')[0]
  return (
    <Link to={`/colecoes/${product.collection}/${product.slug}`} className="plate">
      <span className="plate__frame">
        {m ? (
          <Picture media={m} alt="" sizes={sizes} />
        ) : (
          <span className="plate__empty" aria-hidden="true">
            <span className="plate__empty-name">{product.name}</span>
            <span className="plate__empty-note">Sem fotografia publicada</span>
          </span>
        )}
        <span className="plate__cta" aria-hidden="true">Ver especificações</span>
      </span>
      <span className="plate__name">{product.name}</span>
      <span className="plate__meta">
        {dimension && <span>{dimension}</span>}
        {code && <span>{code}</span>}
      </span>
    </Link>
  )
}
