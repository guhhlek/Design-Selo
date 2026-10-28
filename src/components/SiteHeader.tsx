import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Wordmark } from './Wordmark'
import { NAV } from './nav'
import { setScrollLocked } from '../lib/smoothScroll'
import './site-header.css'


export function SiteHeader() {
  const location = useLocation()
  // the menu belongs to the page it was opened on; any navigation closes it
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === location.key
  const setOpen = (value: boolean | ((v: boolean) => boolean)) =>
    setOpenOn((typeof value === 'function' ? value(open) : value) ? location.key : null)
  const [tucked, setTucked] = useState(false)
  // off the top of a page (and outside the opening), the header gets its own ground
  const [solid, setSolid] = useState(false)

  // Inside the opening the header is part of the composition; past it, it steps
  // aside while reading down and returns on the first scroll up.
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const hero = document.querySelector<HTMLElement>('.hero')
      const pastHero = y > (hero ? hero.offsetTop + hero.offsetHeight - window.innerHeight : 80)
      if (Math.abs(y - last) > 4) setTucked(pastHero && y > last)
      setSolid(pastHero && y > 24)
      last = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null)
    document.addEventListener('keydown', onKey)
    setScrollLocked(true)
    return () => {
      document.removeEventListener('keydown', onKey)
      setScrollLocked(false)
    }
  }, [open])

  return (
    <header className="site-header" data-open={open || undefined} data-tucked={(tucked && !open) || undefined}
      data-solid={(solid && !open) || undefined}
    >
      <a className="site-header__skip" href="#conteudo">Pular para o conteúdo</a>
      <Link to="/" className="site-header__brand" aria-label="dsgnselo — início">
        <Wordmark />
      </Link>
      <nav className="site-header__nav" aria-label="Principal">
        <ul>
          {NAV.map((item) => (
            <li key={item.to}><NavLink to={item.to}>{item.label}</NavLink></li>
          ))}
        </ul>
      </nav>
      <button
        type="button"
        className="site-header__menu"
        aria-expanded={open}
        aria-controls="menu-mobile"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Fechar' : 'Menu'}
      </button>
      <div id="menu-mobile" className="site-header__sheet" hidden={!open}>
        <ul>
          {NAV.map((item) => (
            <li key={item.to}><Link to={item.to} onClick={() => setOpen(false)}>{item.label}</Link></li>
          ))}
        </ul>
      </div>
    </header>
  )
}
