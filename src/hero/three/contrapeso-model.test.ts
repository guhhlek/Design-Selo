import { describe, expect, it } from 'vitest'
import { buildContrapeso, LENGTH } from './contrapeso-model'

describe('contrapeso model', () => {
  const model = buildContrapeso()

  it('is deterministic', () => {
    expect(buildContrapeso()).toEqual(model)
  })

  it('keeps every rod inside the 1600 mm piece', () => {
    for (const r of model.rods) {
      expect(r.x0).toBeGreaterThanOrEqual(-LENGTH / 2)
      expect(r.x1).toBeLessThanOrEqual(LENGTH / 2)
      expect(r.x1).toBeGreaterThan(r.x0)
    }
  })

  it('leaves each linear opening uncovered by its front-row rods', () => {
    for (const o of model.openings) {
      const front = model.rods.filter((r) => r.z === 0 && r.y === o.y)
      for (const r of front) expect(r.x1 <= o.x0 || r.x0 >= o.x1).toBe(true)
    }
  })

  it('assigns every rod a unique landing order', () => {
    const orders = model.rods.map((r) => r.order).sort((a, b) => a - b)
    expect(orders).toEqual(orders.map((_, i) => i))
  })
})
