import { describe, it, expect } from 'vitest'
import { MAX_LEVEL, xpForLevel, levelFromXp, levelProgress } from '../xp'

describe('xp curve', () => {
  it('matches the known RuneScape/Melvor breakpoints', () => {
    // These are the canonical values for this curve. If they ever change, the
    // game's entire pacing has changed and that should be a deliberate decision.
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(83)
    expect(xpForLevel(3)).toBe(174)
    expect(xpForLevel(10)).toBe(1154)
    expect(xpForLevel(50)).toBe(101333)
    expect(xpForLevel(92)).toBe(6517253)
    expect(xpForLevel(99)).toBe(13034431)
  })

  it('is strictly increasing', () => {
    for (let level = 2; level <= MAX_LEVEL; level++) {
      expect(xpForLevel(level)).toBeGreaterThan(xpForLevel(level - 1))
    }
  })

  it('level 92 is roughly half the xp of level 99', () => {
    // The famous halfway point. A useful sanity check that the curve is right.
    expect(xpForLevel(92) / xpForLevel(99)).toBeCloseTo(0.5, 1)
  })

  it('levelFromXp inverts xpForLevel at every boundary', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      expect(levelFromXp(xpForLevel(level))).toBe(level)
      // One xp short of the threshold must still be the previous level.
      if (level > 1) expect(levelFromXp(xpForLevel(level) - 1)).toBe(level - 1)
    }
  })

  it('clamps out-of-range input', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(-500)).toBe(1)
    expect(levelFromXp(999_999_999)).toBe(MAX_LEVEL)
    expect(xpForLevel(0)).toBe(xpForLevel(1))
    expect(xpForLevel(500)).toBe(xpForLevel(MAX_LEVEL))
  })

  it('reports progress through the current level', () => {
    expect(levelProgress(xpForLevel(5))).toBe(0)
    expect(levelProgress(xpForLevel(99))).toBe(1)
    const midway = (xpForLevel(5) + xpForLevel(6)) / 2
    expect(levelProgress(midway)).toBeCloseTo(0.5, 5)
  })
})
