import { useCallback, useSyncExternalStore } from 'react'

// The opening is scroll-scrubbed: nothing moves unless the visitor scrolls, so it
// plays by default even when the OS asks for reduced motion (many Windows installs
// ship with animation effects off). Visitors switch to the still version with an
// explicit control; `?motion=reduce` forces it for review.

const KEY = 'dsgnselo:motion'
const OS_QUERY = '(prefers-reduced-motion: reduce)'
const listeners = new Set<() => void>()

function readChoice(): boolean {
  if (new URLSearchParams(location.search).get('motion') === 'reduce') return true
  try {
    return localStorage.getItem(KEY) === 'reduce'
  } catch {
    return false
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function useReducedMotionChoice() {
  const reduced = useSyncExternalStore(subscribe, readChoice, () => false)
  const setReduced = useCallback((value: boolean) => {
    try {
      if (value) localStorage.setItem(KEY, 'reduce')
      else localStorage.removeItem(KEY)
    } catch {
      // storage unavailable: the choice lasts for this page view only
    }
    if (!value && new URLSearchParams(location.search).get('motion') === 'reduce') {
      history.replaceState(null, '', location.pathname + location.hash)
    }
    listeners.forEach((l) => l())
  }, [])
  return { reduced, setReduced }
}

/** whether the operating system asks for reduced motion (used to tone down autonomous loops) */
export function osPrefersReducedMotion() {
  return window.matchMedia(OS_QUERY).matches
}
