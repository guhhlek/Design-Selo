import type { CSSProperties } from 'react'
import { focusPosition, mediaUrl, type Media } from '../data/catalog'

interface Props {
  media: Media
  alt: string
  /** CSS sizes attribute; defaults to full viewport width */
  sizes?: string
  priority?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Catalogue photograph: responsive sources, intrinsic size to avoid layout shift,
 * the photograph's own dominant tone as the placeholder, and its focal point as
 * object-position — so any frame that crops it keeps the piece in view.
 */
export function Picture({ media, alt, sizes = '100vw', priority, className, style }: Props) {
  return (
    <img
      className={className}
      src={mediaUrl(media.id, 's')}
      srcSet={`${mediaUrl(media.id, 's')} 900w, ${mediaUrl(media.id, 'l')} ${Math.min(2000, media.w)}w`}
      sizes={sizes}
      width={media.w}
      height={media.h}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      style={{
        backgroundColor: media.tone,
        objectPosition: focusPosition(media),
        ...style,
      }}
    />
  )
}
