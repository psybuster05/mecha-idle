/**
 * Deterministic PRNG (mulberry32).
 *
 * The seed lives in GameState and is threaded through the sim so that combat rolls
 * and drop tables are reproducible. This is what lets us unit-test loot and, more
 * importantly, makes offline progress verifiable: the same seed and the same elapsed
 * time must always produce the same result.
 *
 * Never use Math.random() inside sim/.
 */

/** Advance the seed. Returns the next seed and a float in [0, 1). */
export function nextRandom(seed: number): [nextSeed: number, value: number] {
  let t = (seed + 0x6d2b79f5) | 0
  const next = t
  t = Math.imul(t ^ (t >>> 15), 1 | t)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [next, value]
}

/**
 * A small mutable cursor over the seed, for code that needs several rolls in a row.
 * Read `.seed` back into GameState when finished.
 */
export class Rng {
  constructor(public seed: number) {}

  /** Float in [0, 1). */
  next(): number {
    const [seed, value] = nextRandom(this.seed)
    this.seed = seed
    return value
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** True with probability `p` (0..1). */
  chance(p: number): boolean {
    return this.next() < p
  }
}
