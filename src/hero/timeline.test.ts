import { describe, expect, it } from 'vitest'
import { evaluate, resolveCamera, sampleBeat, sampleTrack, track, type Shot, type Vec2 } from './timeline'
import { HERO_IMAGES, landscape, portrait } from './sequence'

const VIEWPORTS: Record<string, Vec2> = {
  desktop: [2880, 1800],
  ultrawide: [3440, 1440],
  laptop: [1366, 768],
  tablet: [1640, 2360],
  phone: [780, 1688],
}

/** image px under a viewport point, inverse of the shader's projection */
function project(cam: ReturnType<typeof resolveCamera>, viewport: Vec2, screen: Vec2): Vec2 {
  const dx = (screen[0] - 0.5) * viewport[0]
  const dy = (screen[1] - 0.5) * viewport[1]
  const c = Math.cos(cam.roll), s = Math.sin(cam.roll)
  return [cam.center[0] + (c * dx + s * dy) * cam.k, cam.center[1] + (-s * dx + c * dy) * cam.k]
}

describe('track', () => {
  it('inherits unspecified values from the previous key', () => {
    const tr = track('x', [{ t: 0, span: 0.5, exposure: 0.2 }, { t: 1, span: 1 }])
    expect(tr.keys[1].exposure).toBe(0.2)
  })

  it('holds the first and last keys outside its range', () => {
    const tr = track('x', [{ t: 0.2, exposure: 0.3 }, { t: 0.8, exposure: 1 }])
    expect(sampleTrack(tr, 0).exposure).toBe(0.3)
    expect(sampleTrack(tr, 1).exposure).toBe(1)
  })

  it('interpolates zoom logarithmically', () => {
    const tr = track('x', [{ t: 0, span: 0.25 }, { t: 1, span: 1, ease: (t) => t }])
    expect(sampleTrack(tr, 0.5).span).toBeCloseTo(0.5)
  })

  it('is reversible: the same progress always gives the same frame', () => {
    const a = evaluate(landscape, 0.42)
    evaluate(landscape, 0.9)
    expect(evaluate(landscape, 0.42)).toEqual(a)
  })
})

describe('beats', () => {
  it('fades in, holds and fades out', () => {
    const b = { id: 'b', in: [0.1, 0.2] as [number, number], out: [0.5, 0.6] as [number, number] }
    expect(sampleBeat(b, 0).visible).toBe(0)
    expect(sampleBeat(b, 0.3).visible).toBe(1)
    expect(sampleBeat(b, 0.7).visible).toBe(0)
    expect(sampleBeat(b, 0).phase).toBe(-1)
    expect(sampleBeat(b, 0.7).phase).toBe(1)
  })
})

describe('camera', () => {
  it('never frames outside the photograph', () => {
    const img: Vec2 = [3440, 1756]
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      for (const seq of [landscape, portrait]) {
        for (let p = 0; p <= 1; p += 0.01) {
          for (const layer of evaluate(seq, p).layers) {
            const cam = resolveCamera(layer as Shot, vp, img)
            for (const corner of [[0, 0], [1, 0], [0, 1], [1, 1]] as Vec2[]) {
              const [x, y] = project(cam, vp, corner)
              expect(x, `${name} p=${p.toFixed(2)} x`).toBeGreaterThanOrEqual(-0.5)
              expect(x, `${name} p=${p.toFixed(2)} x`).toBeLessThanOrEqual(img[0] + 0.5)
              expect(y, `${name} p=${p.toFixed(2)} y`).toBeGreaterThanOrEqual(-0.5)
              expect(y, `${name} p=${p.toFixed(2)} y`).toBeLessThanOrEqual(img[1] + 0.5)
            }
          }
        }
      }
    }
  })
})

describe('sequence', () => {
  for (const [name, seq] of Object.entries({ landscape, portrait })) {
    it(`${name}: there is always one fully opaque photograph (no black holes in dissolves)`, () => {
      for (let p = 0; p <= 1; p += 0.002) {
        const opaque = evaluate(seq, p).layers.some((l) => l.reveal >= 0.999)
        expect(opaque, `p=${p.toFixed(3)}`).toBe(true)
      }
    })

    it(`${name}: only references published photographs`, () => {
      for (const tr of seq.tracks) expect(HERO_IMAGES[tr.image]).toBeDefined()
    })
  }

  it.each([
    ['landscape', landscape, VIEWPORTS.desktop, [0.64, 0.67, 0.7]],
    ['portrait', portrait, VIEWPORTS.phone, [0.7, 0.72, 0.745]],
  ] as const)('%s match cut: rod ends of both photographs stay on the same screen point', (_, seq, vp, cuts) => {
    for (const cut of cuts) {
    const img: Vec2 = [3440, 1756]
    const [wall, room] = ['parede', 'pendentes'].map((id) => evaluate(seq, cut).layers.find((l) => l.image === id)!)
    const toScreen = (shot: Shot, point: Vec2): Vec2 => {
      const cam = resolveCamera(shot, vp, img)
      const dx = (point[0] * img[0] - cam.center[0]) / cam.k
      const dy = (point[1] * img[1] - cam.center[1]) / cam.k
      return [0.5 + dx / vp[0], 0.5 + dy / vp[1]]
    }
    const a = toScreen(wall, [0.112, 0.517])
    const b = toScreen(room, [0.556, 0.635])
    expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `p=${cut}`).toBeLessThan(0.02)
    }
  })
})
