// "A luz ganha forma" — the opening sequence. Act I is a 3D recreation of the
// piece (src/hero/three); act II is written as camera keyframes over two
// Contrapeso photographs from dsgnselo.com:
//
//   parede     (media 10732) Contrapeso wall piece, lit, on a dark wall
//   pendentes  (media 10691) Contrapeso pendants suspended in a room
//
// Both photographs show the same detail — the splayed ends of the 5 mm steel
// rods. The sequence uses it as a match cut: the wall piece's rod ends become the
// red pendant's rod ends, and the camera pulls back into the room.
//
// Image coordinates (0–1, y down) were measured on the originals:
//   parede:    rod bundle x 0.11–0.90, y 0.47–0.565; splayed ends x 0.11–0.20
//   pendentes: red pendant splayed ends at (0.556, 0.635); bundle height 0.07
//   bundle thickness ratio pendentes/parede = 0.07 / 0.095 ≈ 0.74 (match-cut zoom)

import { ease, track, type Beat, type Sequence } from './timeline'

export interface HeroImage {
  id: string
  /** pixel size of the published files (both variants share the aspect) */
  w: number
  h: number
  src: { l: string; m: string }
  alt: string
}

export const HERO_IMAGES: Record<string, HeroImage> = {
  parede: {
    id: 'parede', w: 3440, h: 1756,
    src: { l: '/assets/hero/contrapeso-parede-l.webp', m: '/assets/hero/contrapeso-parede-m.webp' },
    alt: 'Luminária de parede Contrapeso acesa sobre parede escura: feixe horizontal de tarugos de aço com aberturas lineares de luz.',
  },
  pendentes: {
    id: 'pendentes', w: 3440, h: 1756,
    src: { l: '/assets/hero/contrapeso-pendentes-l.webp', m: '/assets/hero/contrapeso-pendentes-m.webp' },
    alt: 'Pendentes Contrapeso suspensos em um ambiente claro, em diferentes acabamentos, com luz difusa voltada para baixo.',
  },
}

const MATCH = 0.74
const Q = Math.PI / 2

/**
 * Act I (0 → ACT_END) is the 3D recreation (src/hero/three). It ends on the exact
 * framing the wall photograph has at ACT_END, then cross-dissolves into it over
 * [ACT_END, ACT_END + HANDOFF]. Act II is the photographs.
 */
export const ACT_END = 0.42
export const HANDOFF = 0.035

/** image points of the bundle's two ends in the wall photograph (for the 3D match) */
export const PAREDE_ENDS: [[number, number], [number, number]] = [[0.11, 0.517], [0.9, 0.517]]

/** Text beats, shared by both layouts. Ranges are scroll progress. */
const BEATS: Beat[] = [
  { id: 'cue', in: [-1, 0], out: [0.01, 0.04] },
  { id: 'note3d', in: [0.02, 0.06], out: [0.39, 0.43] },
  // act I — 3D
  { id: 'rods', in: [0.025, 0.06], out: [0.1, 0.125] },
  { id: 'assemble', in: [0.125, 0.155], out: [0.19, 0.215] },
  { id: 'off', in: [0.215, 0.24], out: [0.265, 0.285] },
  { id: 'on', in: [0.3, 0.33], out: [0.38, 0.41] },
  // act II — photographs
  { id: 'photo', in: [0.44, 0.48], out: [0.58, 0.62] },
  { id: 'form', in: [0.47, 0.52], out: [0.58, 0.62] },
  { id: 'research', in: [0.75, 0.8], out: [0.87, 0.9] },
  { id: 'signature', in: [0.91, 0.98] },
  // portrait only (hidden in landscape by CSS): a low veil that keeps type legible over the lit piece
  { id: 'veil', in: [0.02, 0.08], out: [0.6, 0.66] },
  // the room dissolves into the paper of the next section
  { id: 'handoff', in: [0.955, 1] },
]

/** Chapter markers, used by the progress rail (also keyboard navigation). */
export const CHAPTERS = [
  { at: 0, label: 'Matéria' },
  { at: 0.12, label: 'Montagem' },
  { at: 0.215, label: 'Objeto' },
  { at: 0.29, label: 'Luz' },
  { at: 0.45, label: 'Forma' },
  { at: 0.72, label: 'Espaço' },
  { at: 0.94, label: 'Assinatura' },
] as const

export const landscape: Sequence = {
  beats: BEATS,
  tracks: [
    track('parede', [
      // under the 3D act: the whole lit piece, the framing act I ends on
      { t: 0, at: [0.5, 0.52], to: [0.5, 0.5], span: 1.0, ignite: 1.1 },
      { t: ACT_END + HANDOFF },
      // the real thing, up close: the light inside the openings
      { t: 0.55, at: [0.43, 0.52], span: 0.42, ease: ease.inOut },
      // set up the match cut on the splayed ends
      { t: 0.63, at: [0.112, 0.517], to: [0.24, 0.5], span: 0.5 },
      // stays opaque underneath while the next photograph reveals over it
      { t: 0.71, span: 0.44, ease: ease.linear },
      { t: 0.712, reveal: 0, ease: ease.linear },
    ]),
    track('pendentes', [
      // keyed in lockstep with the wall track so the rod ends stay registered through the cut
      { t: 0.63, at: [0.556, 0.635], to: [0.24, 0.5], span: 0.5 * MATCH, reveal: 0 },
      { t: 0.71, span: 0.44 * MATCH, reveal: 1, ease: ease.linear },
      // espaço: the camera leaves the object and finds the room
      { t: 0.87, at: [0.5, 0.5], to: [0.5, 0.5], span: 1.0, ease: ease.settle },
      // assinatura: the light fills the frame
      { t: 1, span: 0.95, exposure: 1.12 },
    ]),
  ],
}

export const portrait: Sequence = {
  beats: BEATS,
  tracks: [
    track('parede', [
      // rolled 90°: the bundle stands vertically in the right third, type on the left
      { t: 0, at: [0.5, 0.518], to: [0.66, 0.45], span: 1.75, roll: Q, ignite: 1.1 },
      { t: ACT_END + HANDOFF },
      { t: 0.53, at: [0.45, 0.518], span: 0.72 },
      { t: 0.61, at: [0.3, 0.518], span: 1.1 },
      // once the type has gone, the piece turns back to horizontal into the match cut
      { t: 0.69, at: [0.112, 0.517], to: [0.3, 0.45], span: 0.5, roll: 0 },
      { t: 0.75, span: 0.45, ease: ease.linear },
      { t: 0.752, reveal: 0, ease: ease.linear },
    ]),
    track('pendentes', [
      { t: 0.69, at: [0.556, 0.635], to: [0.3, 0.45], span: 0.5 * MATCH, reveal: 0 },
      { t: 0.75, span: 0.45 * MATCH, reveal: 1, ease: ease.linear },
      { t: 0.87, at: [0.68, 0.56], to: [0.5, 0.5], span: 1.0, ease: ease.settle },
      { t: 1, span: 0.96, exposure: 1.12 },
    ]),
  ],
}

export function pickSequence(width: number, height: number): Sequence {
  return width / height < 0.9 ? portrait : landscape
}
