// Contrapeso Parede 1 Vazado, recreated as data for the 3D act.
//
// Sources (nothing invented beyond the arrangement read from the photograph):
//   - collection text: "sobreposição de longos tarugos de aço de 5 milímetros",
//     "montadas manualmente, sem a necessidade de solda"
//   - product spec (DS01026): 42 x 1600 x 75 mm, "tarugos de aço com aberturas lineares,
//     difusor em policarbonato", indirect diffuse light
//   - photograph media 10732: row count, staggered rod ends and opening positions,
//     measured on the original (bundle x 0.11–0.90 of the frame)
//
// Units are millimetres. x runs along the piece, y up, z out of the wall.

export const ROD_DIAMETER = 5
export const LENGTH = 1600
const ROWS = 15
const PITCH = 5.3
/** the bundle stands off the wall; the light strip sits between bundle and wall */
export const WALL_Z = -46

export interface Rod {
  /** start/end along x */
  x0: number
  x1: number
  y: number
  z: number
  /** order in which the rod lands during assembly (0 = first) */
  order: number
}

export interface Opening {
  x0: number
  x1: number
  y: number
}

// Openings read from the photograph, as fractions of the piece length per row
// (row 0 = top).
const OPENINGS: [row: number, u0: number, u1: number][] = [
  [2, 0.29, 0.45],
  [4, 0.39, 0.73],
  [8, 0.25, 0.47],
  [9, 0.54, 0.75],
  [12, 0.29, 0.63],
]

/** deterministic pseudo-random, so the piece is identical on every visit */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export interface ContrapesoModel {
  rods: Rod[]
  openings: Opening[]
  height: number
}

export function buildContrapeso(): ContrapesoModel {
  const rand = rng(0xc0ffee)
  const rods: Rod[] = []
  const openings: Opening[] = []
  const height = (ROWS - 1) * PITCH
  const half = LENGTH / 2

  for (let row = 0; row < ROWS; row++) {
    const y = height / 2 - row * PITCH
    // asymmetric, splayed ends: up to ~6% of the length at the left, ~3% at the right,
    // like the photographed piece
    const left = -half + rand() * LENGTH * 0.06
    const right = half - rand() * LENGTH * 0.03

    // back layer: continuous rods, against the light strip
    rods.push({ x0: left + rand() * 20, x1: right - rand() * 20, y, z: -ROD_DIAMETER * 0.9, order: 0 })

    // front layer: continuous, or split around a linear opening
    const opening = OPENINGS.find(([r]) => r === row)
    if (opening) {
      const ox0 = -half + opening[1] * LENGTH
      const ox1 = -half + opening[2] * LENGTH
      rods.push({ x0: left, x1: ox0, y, z: 0, order: 0 })
      rods.push({ x0: ox1, x1: right, y, z: 0, order: 0 })
      openings.push({ x0: ox0, x1: ox1, y })
    } else {
      rods.push({ x0: left, x1: right, y, z: 0, order: 0 })
    }
  }

  // land the back layer first, then the front, roughly top to bottom with a little jitter
  const sorted = rods
    .map((r, i) => ({ r, key: (r.z < 0 ? 0 : 100) + i * 0.5 + rand() * 6 }))
    .sort((a, b) => a.key - b.key)
  sorted.forEach(({ r }, i) => { r.order = i })

  return { rods, openings, height }
}
