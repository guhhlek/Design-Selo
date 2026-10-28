import type { ReactNode } from 'react'
import './page-head.css'

interface Props {
  eyebrow: string
  title: ReactNode
  intro?: ReactNode
  actions?: ReactNode
}

/** Opening of the institutional pages: one measured title, its introduction alongside. */
export function PageHead({ eyebrow, title, intro, actions }: Props) {
  return (
    <header className="phead">
      <p className="phead__eyebrow"><span className="phead__light" aria-hidden="true" />{eyebrow}</p>
      <h1 className="phead__title">{title}</h1>
      {(intro || actions) && (
        <div className="phead__aside">
          {intro && <div className="phead__intro">{intro}</div>}
          {actions && <div className="phead__actions">{actions}</div>}
        </div>
      )}
    </header>
  )
}
