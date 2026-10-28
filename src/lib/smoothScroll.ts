import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let instance: Lenis | null = null

/** Inertial wheel scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync. Touch stays native. */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: true })
    instance = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      instance = null
    }
  }, [enabled])
}

/** Scrolls to an absolute position, smoothly when Lenis is active. */
export function scrollToY(y: number) {
  if (instance) instance.scrollTo(y, { duration: 1.6 })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

/** Locks page scrolling (overlays, menus); Lenis ignores overflow, so it is paused too. */
export function setScrollLocked(locked: boolean) {
  document.documentElement.style.overflow = locked ? 'hidden' : ''
  if (locked) instance?.stop()
  else instance?.start()
}

/** Jumps to a position without animation (route changes). */
export function jumpTo(y: number) {
  if (instance) instance.scrollTo(y, { immediate: true, force: true })
  else window.scrollTo(0, y)
}
