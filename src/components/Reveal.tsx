import type { ReactNode } from 'react'
import { useInView } from '../lib/useInView'

/** Content that rises into place when it enters the viewport (styles: .reveal in base.css). */
export function Reveal({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'li' }) {
  const [ref, inView] = useInView<HTMLElement>(0.12)
  return (
    // one ref type for the three possible tags
    <Tag ref={ref as never} className={`reveal ${className ?? ''}`} data-inview={inView || undefined}>
      {children}
    </Tag>
  )
}
