/**
 * Skill levelling curve.
 *
 * Uses the classic RuneScape/Melvor curve, which is the reason those games pace
 * well over hundreds of hours: each level costs ~10% more than the last, so early
 * levels arrive fast and late ones are real commitments.
 *
 *   xp(1) = 0
 *   xp(L) = floor( (1/4) * sum_{i=1..L-1} floor(i + 300 * 2^(i/7)) )
 */

export const MAX_LEVEL = 99

/** xpTable[L] = total xp required to *be* level L. Index 0 is unused. */
const xpTable: number[] = (() => {
  const table = [0, 0]
  let acc = 0
  for (let i = 1; i < MAX_LEVEL; i++) {
    acc += Math.floor(i + 300 * Math.pow(2, i / 7))
    table[i + 1] = Math.floor(acc / 4)
  }
  return table
})()

/** Total xp required to reach `level`. Clamped to [1, MAX_LEVEL]. */
export function xpForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))
  return xpTable[clamped] ?? 0
}

/** The level a given total xp corresponds to. */
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1
  // Small fixed table; a linear scan is plenty and keeps this obviously correct.
  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (xp >= (xpTable[level] ?? 0)) return level
  }
  return 1
}

/** Progress through the current level, 0..1. Returns 1 at max level. */
export function levelProgress(xp: number): number {
  const level = levelFromXp(xp)
  if (level >= MAX_LEVEL) return 1
  const floor = xpForLevel(level)
  const ceil = xpForLevel(level + 1)
  return (xp - floor) / (ceil - floor)
}

export const MAX_LEVEL_XP = xpForLevel(MAX_LEVEL)
