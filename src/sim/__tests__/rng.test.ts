import { describe, it, expect } from 'vitest'
import { Rng, nextRandom } from '../rng'

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng(12345)
    const b = new Rng(12345)
    const seqA = Array.from({ length: 50 }, () => a.next())
    const seqB = Array.from({ length: 50 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 20 }, (_, i) => nextRandom(1 + i)[1])
    const b = Array.from({ length: 20 }, (_, i) => nextRandom(999 + i)[1])
    expect(a).not.toEqual(b)
  })

  it('stays within [0, 1)', () => {
    const rng = new Rng(7)
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is roughly uniform', () => {
    const rng = new Rng(42)
    const buckets = new Array<number>(10).fill(0)
    const samples = 100_000
    for (let i = 0; i < samples; i++) {
      const bucket = Math.floor(rng.next() * 10)
      buckets[bucket] = (buckets[bucket] ?? 0) + 1
    }
    // Each bucket should hold ~10% of samples. Generous tolerance - this is a
    // smoke test for a badly broken generator, not a statistics exam.
    for (const count of buckets) {
      expect(count / samples).toBeGreaterThan(0.08)
      expect(count / samples).toBeLessThan(0.12)
    }
  })

  it('int() covers its inclusive bounds', () => {
    const rng = new Rng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) seen.add(rng.int(1, 5))
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('chance() approximates its probability', () => {
    const rng = new Rng(11)
    let hits = 0
    const trials = 50_000
    for (let i = 0; i < trials; i++) if (rng.chance(0.25)) hits++
    expect(hits / trials).toBeCloseTo(0.25, 2)
  })

  it('advancing the seed is a pure function', () => {
    expect(nextRandom(5)).toEqual(nextRandom(5))
  })
})
