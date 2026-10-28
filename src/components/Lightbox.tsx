import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { mediaUrl, type Media } from '../data/catalog'
import { setScrollLocked } from '../lib/smoothScroll'
import './lightbox.css'

interface Props {
  items: Media[]
  index: number | null
  title: string
  onClose: () => void
  onIndex: (i: number) => void
}

/**
 * Full-screen viewer for studying a piece: the whole photograph within the screen,
 * click (or tap) to zoom into the finish and move to pan; arrows, swipe and Esc.
 */
export function Lightbox({ items, index, title, onClose, onIndex }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // zoom belongs to one photograph; moving to another starts unzoomed
  const [zoomedAt, setZoomedAt] = useState<number | null>(null)
  const zoom = zoomedAt !== null && zoomedAt === index
  const [origin, setOrigin] = useState('50% 50%')
  const swipe = useRef<{ x: number; t: number } | null>(null)
  const open = index !== null

  useEffect(() => {
    const d = dialogRef.current!
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
    setScrollLocked(open)
    return () => { if (open) setScrollLocked(false) }
  }, [open])

  const go = useCallback(
    (step: number) => index !== null && onIndex((index + step + items.length) % items.length),
    [index, items.length, onIndex],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go])

  const pointAt = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
  }

  const m = index !== null ? items[index] : null

  return (
    <dialog ref={dialogRef} className="lightbox" aria-label={title} onClose={onClose} onCancel={onClose}>
      {m && (
        <>
          <figure
            className="lightbox__stage"
            data-zoom={zoom || undefined}
            onPointerDown={(e) => { swipe.current = { x: e.clientX, t: Date.now() } }}
            onPointerUp={(e) => {
              const s = swipe.current
              swipe.current = null
              if (s && Math.abs(e.clientX - s.x) > 60 && Date.now() - s.t < 600 && !zoom) {
                go(e.clientX < s.x ? 1 : -1)
                return
              }
              pointAt(e)
              setZoomedAt(zoom ? null : index)
            }}
            onPointerMove={(e) => zoom && pointAt(e)}
          >
            <img
              key={m.id}
              src={mediaUrl(m.id, 'l')}
              width={m.w}
              height={m.h}
              alt={m.caption ?? `${title} — imagem ${index! + 1}`}
              style={{ transformOrigin: origin, backgroundColor: m.tone }}
              draggable={false}
            />
          </figure>
          <div className="lightbox__bar">
            <p className="lightbox__count">
              <span>{String(index! + 1).padStart(2, '0')}</span> / {String(items.length).padStart(2, '0')}
            </p>
            <p className="lightbox__title">{m.caption ?? title}</p>
            <p className="lightbox__hint">{zoom ? 'Mova para explorar · toque para sair' : 'Toque para ampliar'}</p>
          </div>
          {items.length > 1 && (
            <>
              <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label="Imagem anterior">←</button>
              <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label="Próxima imagem">→</button>
            </>
          )}
          <button type="button" className="lightbox__close" onClick={onClose}>Fechar</button>
        </>
      )}
    </dialog>
  )
}
