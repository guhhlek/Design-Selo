import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from 'react-router-dom'
import { Wordmark } from '../components/Wordmark'
import { useReducedMotionChoice } from '../lib/usePrefersReducedMotion'
import { scrollToY } from '../lib/smoothScroll'
import { createRenderer, type Renderer } from './renderer'
import { ACT_END, CHAPTERS, HANDOFF, HERO_IMAGES, PAREDE_ENDS, pickSequence } from './sequence'
import { clamp01, evaluate, resolveCamera, sampleTrack, type FrameState, type Sequence, type Vec2 } from './timeline'
import type { ContrapesoScene, PhotoFraming } from './three/ContrapesoScene'
import { HeroStatic } from './HeroStatic'
import './hero.css'

gsap.registerPlugin(ScrollTrigger)

const MAX_DPR = 2

function loadImage(src: string, priority: 'high' | 'low') {
  const img = new Image()
  img.decoding = 'async'
  img.fetchPriority = priority
  img.src = src
  return img.decode().then(() => img)
}

/**
 * Where the wall photograph shows the bundle's ends at the end of act I, in screen
 * fractions — act I's camera lands exactly there so the dissolve registers.
 */
function photoFraming(seq: Sequence, viewport: Vec2): PhotoFraming {
  const tr = seq.tracks.find((t) => t.image === 'parede')!
  const shot = sampleTrack(tr, ACT_END)
  const img: Vec2 = [HERO_IMAGES.parede.w, HERO_IMAGES.parede.h]
  const cam = resolveCamera(shot, viewport, img)
  const c = Math.cos(cam.roll)
  const s = Math.sin(cam.roll)
  const toScreen = ([u, v]: Vec2): Vec2 => {
    const ix = (u * img[0] - cam.center[0]) / cam.k
    const iy = (v * img[1] - cam.center[1]) / cam.k
    // inverse of the shader's rotation
    return [0.5 + (c * ix - s * iy) / viewport[0], 0.5 + (s * ix + c * iy) / viewport[1]]
  }
  return { left: toScreen(PAREDE_ENDS[0]), right: toScreen(PAREDE_ENDS[1]) }
}

/** Writes beat/chapter state straight onto the DOM (runs every scroll frame). */
function applyOverlay(root: HTMLElement, frame: FrameState, progress: number) {
  root.querySelectorAll<HTMLElement>('[data-beat]').forEach((el) => {
    const b = frame.beats[el.dataset.beat!]
    if (!b) return
    el.style.opacity = String(b.visible)
    el.style.setProperty('--beat-shift', String(b.phase))
    el.style.setProperty('--v', b.visible.toFixed(3))
    el.style.visibility = b.visible < 0.01 ? 'hidden' : 'visible'
  })
  let active = 0
  CHAPTERS.forEach((c, i) => { if (progress >= c.at - 0.001) active = i })
  root.querySelectorAll<HTMLElement>('[data-chapter]').forEach((el, i) => {
    el.toggleAttribute('data-active', i === active)
    if (i === active) el.setAttribute('aria-current', 'step')
    else el.removeAttribute('aria-current')
  })
  root.style.setProperty('--hero-progress', progress.toFixed(4))
  // the room photograph is light; the header switches to ink once it has taken over
  const room = frame.layers.find((l) => l.image === 'pendentes')
  document.documentElement.dataset.headerTone = room && room.reveal > 0.6 ? 'dark' : 'light'
}

export function HeroSequence() {
  const { reduced, setReduced } = useReducedMotionChoice()
  const [failed, setFailed] = useState(false)
  const onFail = useCallback(() => setFailed(true), [])
  if (failed) return <HeroStatic />
  if (reduced) return <HeroStatic onEnableMotion={() => setReduced(false)} />
  return <HeroScroll onFail={onFail} onReduceMotion={() => setReduced(true)} />
}

function HeroScroll({ onFail, onReduceMotion }: { onFail: () => void; onReduceMotion: () => void }) {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvas3dRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const section = sectionRef.current!
    const stage = stageRef.current!
    const canvas = canvasRef.current!
    const canvas3d = canvas3dRef.current!
    const params = new URLSearchParams(location.search)

    let renderer: Renderer
    try {
      renderer = createRenderer(canvas, params.has('canvas2d') ? '2d' : 'auto')
    } catch (err) {
      console.warn('[hero] renderer failed', err)
      onFail()
      return
    }
    section.dataset.renderer = renderer.kind

    let disposed = false
    let progress = 0
    let size: Vec2 = [stage.clientWidth, stage.clientHeight]
    let sequence = pickSequence(size[0], size[1])
    let framing = photoFraming(sequence, size)
    let scene: ContrapesoScene | null = null
    // act I: 'loading' keeps the stage dark (the opening starts in darkness either way)
    let act1: 'loading' | '3d' | 'none' = params.has('no3d') ? 'none' : 'loading'
    let raf = 0

    const draw = () => {
      raf = 0
      if (disposed) return
      const frame = evaluate(sequence, progress)
      // act I covers the photographs completely until the hand-off begins
      const fade = act1 === '3d' ? clamp01((progress - ACT_END) / HANDOFF) : act1 === 'none' ? 1 : 0
      canvas3d.style.opacity = String(1 - fade)
      if (scene && fade < 1) scene.render(clamp01(progress / ACT_END), framing)
      if (fade > 0) renderer.render(frame)
      applyOverlay(section, frame, progress)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw) }

    const isPhone = () => Math.min(window.innerWidth, window.innerHeight) < 700
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      size = [stage.clientWidth, stage.clientHeight]
      renderer.resize(Math.round(size[0] * dpr), Math.round(size[1] * dpr))
      scene?.resize(size[0], size[1], Math.min(dpr, isPhone() ? 1.25 : 1.5))
      sequence = pickSequence(size[0], size[1])
      framing = photoFraming(sequence, size)
      draw()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(stage)
    resize()

    // Act I: the 3D module is split out and loaded straight away.
    if (!params.has('no3d')) {
      import('./three/ContrapesoScene')
        .then(({ ContrapesoScene }) => {
          if (disposed) return
          scene = new ContrapesoScene(canvas3d, isPhone())
          act1 = '3d'
          section.dataset.act1 = '3d'
          resize()
          setReady(true)
        })
        .catch((err) => {
          // without 3D, the photographs carry the whole opening
          console.warn('[hero] 3D act unavailable', err)
          act1 = 'none'
          section.dataset.act1 = 'none'
          setReady(true)
          draw()
        })
    }

    // Act II photographs: the wall piece first (it is also the 3D fallback), then the room.
    const variant = window.matchMedia('(min-width: 1101px)').matches ? 'l' : 'm'
    loadImage(HERO_IMAGES.parede.src[variant], 'high')
      .then((img) => {
        if (disposed) return
        renderer.setImage('parede', img)
        if (params.has('no3d')) setReady(true)
        draw()
        return loadImage(HERO_IMAGES.pendentes.src[variant], 'low')
      })
      .then((img) => {
        if (disposed || !img) return
        renderer.setImage('pendentes', img)
        draw()
      })
      .catch((err) => {
        console.warn('[hero] image failed', err)
        if (!disposed) onFail()
      })

    const proxy = { p: 0 }
    const tween = gsap.to(proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      onUpdate: () => { progress = proxy.p; schedule() },
    })

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      tween.scrollTrigger?.kill()
      tween.kill()
      ro.disconnect()
      renderer.dispose()
      scene?.dispose()
      delete document.documentElement.dataset.headerTone
    }
  }, [onFail])

  const goToChapter = (at: number) => {
    const section = sectionRef.current!
    const top = section.getBoundingClientRect().top + window.scrollY
    const travel = section.offsetHeight - window.innerHeight
    scrollToY(top + travel * at)
  }

  return (
    <section ref={sectionRef} className="hero" aria-labelledby="hero-title" data-ready={ready || undefined}>
      <div ref={stageRef} className="hero__stage">
        <canvas
          ref={canvasRef}
          className="hero__canvas"
          role="img"
          aria-label={`${HERO_IMAGES.parede.alt} ${HERO_IMAGES.pendentes.alt}`}
        />
        <canvas
          ref={canvas3dRef}
          className="hero__canvas hero__canvas--3d"
          role="img"
          aria-label="Recriação 3D da luminária Contrapeso: tarugos de aço soltos no escuro se encaixam um a um até formar a peça, que então acende."
        />

        <div className="hero__veil" data-beat="veil" aria-hidden="true" />
        <div className="hero__handoff" data-beat="handoff" aria-hidden="true" />

        <h1 id="hero-title" className="visually-hidden">
          dsgnselo — estúdio de criação e marca brasileira de design de luminárias autorais
        </h1>

        <p className="hero__cue" data-beat="cue">
          <span className="hero__cue-line" aria-hidden="true" />
          <span className="hero__cue-desktop">Role para montar a peça</span>
          <span className="hero__cue-touch">Deslize para montar a peça</span>
        </p>

        <p className="hero__note" data-beat="note3d">Recriação 3D a partir das especificações da peça</p>
        <p className="hero__note" data-beat="photo">Contrapeso · fotografia</p>

        <div className="hero__big" data-beat="rods">
          <p className="hero__big-figure">5<span>mm</span></p>
          <p className="hero__big-caption">Tarugos de aço.<br />A matéria da Contrapeso.</p>
        </div>

        <p className="hero__line hero__line--assemble" data-beat="assemble">
          Montada manualmente, <em>sem solda.</em>
        </p>

        <p className="hero__line hero__line--off" data-beat="off">
          Quando apagada, permanece como objeto escultórico.
        </p>

        <p className="hero__line hero__line--on" data-beat="on">
          Quando acesa, organiza a luz no espaço.
        </p>

        <p className="hero__display" data-beat="form">
          Luz e forma <em>coexistem.</em>
        </p>

        <blockquote className="hero__quote" data-beat="research">
          <p>Somos, antes de tudo, pesquisadores da&nbsp;luz.</p>
        </blockquote>

        <div className="hero__signature" data-beat="signature">
          <Wordmark className="hero__wordmark" />
          <p className="hero__claim">
            Estúdio de criação e marca brasileira de design de luminárias autorais.
          </p>
          <p className="hero__credit">
            <Link to="/colecoes/contrapeso">Coleção Contrapeso</Link>
            <span aria-hidden="true"> · </span>
            <span>design Alberth Murta</span>
          </p>
        </div>

        <nav className="hero__rail" aria-label="Capítulos da abertura">
          <ol>
            {CHAPTERS.map((c, i) => (
              <li key={c.label}>
                <button type="button" data-chapter onClick={() => goToChapter(c.at)}>
                  <span className="hero__rail-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="hero__rail-label">{c.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="hero__controls">
          <button type="button" onClick={onReduceMotion}>Reduzir movimento</button>
          <a href="#colecoes">Pular abertura</a>
        </div>
      </div>
    </section>
  )
}
