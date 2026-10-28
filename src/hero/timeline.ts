// Pure scroll-timeline maths for the opening sequence.
// progress (0–1) -> what every photographic layer and text beat should look like.
// No DOM, no WebGL: renderers consume FrameState, tests exercise it directly.

export type Vec2 = [number, number]

/** A virtual camera pointed at one photograph, plus how that photograph is lit. */
export interface Shot {
  /** point in the image (0–1, y down) ... */
  at: Vec2
  /** ... pinned to this point of the viewport (0–1, y down) */
  to: Vec2
  /** fraction of the image height visible across the viewport height (zoom; smaller = closer) */
  span: number
  /** camera roll in radians */
  roll: number
  /** global light level, 1 = photograph as shot */
  exposure: number
  /** image-x up to which the lamp's own light is on (−0.1 = fully off, 1.1 = fully on) */
  ignite: number
  /** screen-x of a raking light band that catches metal edges (−0.5 = out of frame) */
  glint: number
  /** luminance-ordered dissolve: highlights appear first (0 = hidden, 1 = visible) */
  reveal: number
}

export type Ease = (t: number) => number

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  /** slow, long-tailed settle used for camera moves */
  settle: (t: number) => 1 - Math.pow(1 - t, 4),
} satisfies Record<string, Ease>

export interface Key extends Partial<Shot> {
  t: number
  /** easing of the segment that ENDS at this key */
  ease?: Ease
}

interface ResolvedKey extends Shot {
  t: number
  ease: Ease
}

export interface Track {
  image: string
  keys: ResolvedKey[]
}

const DEFAULT_SHOT: Shot = {
  at: [0.5, 0.5], to: [0.5, 0.5], span: 1, roll: 0,
  exposure: 1, ignite: 1.1, glint: -0.5, reveal: 1,
}

/** Builds a track; each key inherits whatever it leaves unspecified from the previous key. */
export function track(image: string, keys: Key[]): Track {
  let prev: Shot = DEFAULT_SHOT
  const resolved = [...keys].sort((a, b) => a.t - b.t).map((k) => {
    const r: ResolvedKey = { ...prev, ...k, ease: k.ease ?? ease.inOut }
    prev = r
    return r
  })
  return { image, keys: resolved }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export function sampleTrack(tr: Track, p: number): Shot {
  const keys = tr.keys
  if (p <= keys[0].t) return keys[0]
  const last = keys[keys.length - 1]
  if (p >= last.t) return last
  let i = 1
  while (keys[i].t < p) i++
  const a = keys[i - 1]
  const b = keys[i]
  const t = b.ease(clamp01((p - a.t) / (b.t - a.t)))
  return {
    at: lerp2(a.at, b.at, t),
    to: lerp2(a.to, b.to, t),
    // zoom is perceived logarithmically
    span: Math.exp(lerp(Math.log(a.span), Math.log(b.span), t)),
    roll: lerp(a.roll, b.roll, t),
    exposure: lerp(a.exposure, b.exposure, t),
    ignite: lerp(a.ignite, b.ignite, t),
    glint: lerp(a.glint, b.glint, t),
    reveal: lerp(a.reveal, b.reveal, t),
  }
}

/** A piece of typography that fades/slides in over [in0,in1] and out over [out0,out1]. */
export interface Beat {
  id: string
  in: [number, number]
  out?: [number, number]
}

export interface BeatState {
  /** 0 hidden, 1 fully shown */
  visible: number
  /** −1 before (entering), 0 settled, +1 leaving */
  phase: number
}

export function sampleBeat(b: Beat, p: number): BeatState {
  const enter = ease.out(clamp01((p - b.in[0]) / (b.in[1] - b.in[0])))
  const leave = b.out ? ease.in(clamp01((p - b.out[0]) / (b.out[1] - b.out[0]))) : 0
  return { visible: enter * (1 - leave), phase: leave > 0 ? leave : enter - 1 }
}

export interface Sequence {
  tracks: Track[]
  beats: Beat[]
}

export interface LayerFrame extends Shot {
  image: string
}

export interface FrameState {
  layers: LayerFrame[]
  beats: Record<string, BeatState>
}

export function evaluate(seq: Sequence, p: number): FrameState {
  const progress = clamp01(p)
  const layers = seq.tracks
    .map((tr) => ({ image: tr.image, ...sampleTrack(tr, progress) }))
    .filter((l) => l.reveal > 0.001 && l.exposure > 0.001)
  const beats: Record<string, BeatState> = {}
  for (const b of seq.beats) beats[b.id] = sampleBeat(b, progress)
  return { layers, beats }
}

// ---------- camera projection ----------

export interface Camera {
  /** image-space point (pixels) under the viewport centre */
  center: Vec2
  /** image pixels per viewport pixel */
  k: number
  roll: number
}

/**
 * Resolves a Shot into a concrete camera for a viewport, and keeps the frame
 * inside the photograph (zooming in / shifting as needed) so no edge is ever shown.
 */
export function resolveCamera(shot: Shot, viewport: Vec2, image: Vec2): Camera {
  const [W, H] = viewport
  const [iw, ih] = image
  const c = Math.cos(shot.roll)
  const s = Math.sin(shot.roll)
  let k = (shot.span * ih) / H

  // image-space extent covered by the (rotated) viewport
  const ex = (W * Math.abs(c) + H * Math.abs(s))
  const ey = (W * Math.abs(s) + H * Math.abs(c))
  k = Math.min(k, iw / ex, ih / ey)

  // image point under viewport centre: at + R·(centre − to)·k
  const dx = (0.5 - shot.to[0]) * W
  const dy = (0.5 - shot.to[1]) * H
  let cx = shot.at[0] * iw + (c * dx + s * dy) * k
  let cy = shot.at[1] * ih + (-s * dx + c * dy) * k

  const hx = (ex * k) / 2
  const hy = (ey * k) / 2
  cx = Math.min(iw - hx, Math.max(hx, cx))
  cy = Math.min(ih - hy, Math.max(hy, cy))
  return { center: [cx, cy], k, roll: shot.roll }
}
