import { describe, it, expect } from 'vitest'
import { SKILLS } from '../index'
import type { SkillDef } from '../types'
import { MAX_LEVEL, xpForLevel } from '../../sim/xp'
import { newGame } from '../../sim/state'
import { equipItem } from '../../sim/equipment'
import { derivedStats } from '../../sim/stats'

/**
 * Pacing.
 *
 * The design target is "about a month to max a skill". These tests turn that from a
 * hope into an assertion, so a casual xp tweak cannot quietly turn the game into a
 * three-day sprint or a six-month slog.
 *
 * 500 hours reads as roughly a month across every play pattern in the GDD:
 *   ~21 days always-on · ~30 days at ~17h/day · ~42 days at a strict 12h/day
 *
 * These figures are the *unequipped* baseline. Arms grant skillSpeed, so a well-kitted
 * player beats them - which is the point of an unlockable speed-up.
 */

const HOUR = 3600
const TARGET_HOURS = 500
/** Generous either side: this guards the design intent, it is not a straitjacket. */
const MIN_HOURS = 380
const MAX_HOURS = 650

/** Best xp per second available at a given level. */
function bestRate(skill: SkillDef, level: number): number {
  return Math.max(
    ...skill.actions
      .filter((a) => a.levelRequired <= level)
      .map((a) => a.xp / a.duration),
  )
}

/** Hours from level 1 to 99, always using the best unlocked action. */
function hoursTo99(skill: SkillDef): number {
  let seconds = 0
  for (let level = 1; level < MAX_LEVEL; level++) {
    seconds += (xpForLevel(level + 1) - xpForLevel(level)) / bestRate(skill, level)
  }
  return seconds / HOUR
}

/** Hours elapsed at the moment a given level is reached. */
function hoursAtLevel(skill: SkillDef, target: number): number {
  let seconds = 0
  for (let level = 1; level < target; level++) {
    seconds += (xpForLevel(level + 1) - xpForLevel(level)) / bestRate(skill, level)
  }
  return seconds / HOUR
}

const gathering = SKILLS

describe('time to max a skill', () => {
  for (const skill of gathering) {
    it(`${skill.name} maxes in roughly a month`, () => {
      const hours = hoursTo99(skill)
      expect(hours, `${skill.name} takes ${hours.toFixed(0)}h`).toBeGreaterThan(MIN_HOURS)
      expect(hours, `${skill.name} takes ${hours.toFixed(0)}h`).toBeLessThan(MAX_HOURS)
    })
  }

  it('keeps the three skills within sight of each other', () => {
    const hours = gathering.map(hoursTo99)
    const spread = Math.max(...hours) / Math.min(...hours)
    expect(spread, 'one skill is far slower than the others').toBeLessThan(1.6)
  })
})

/**
 * The failure this suite exists to prevent.
 *
 * The first balance pass unlocked all four Scavenging tiers by level 40 - which took
 * two hours - and then asked the player to repeat one action for the remaining 482.
 * Total time was fine; the distribution was broken.
 */
describe('content keeps arriving', () => {
  for (const skill of gathering) {
    it(`${skill.name} does not run out of new actions early`, () => {
      const total = hoursTo99(skill)
      const last = skill.actions.reduce((a, b) => (a.levelRequired > b.levelRequired ? a : b))
      const unlockedAt = hoursAtLevel(skill, last.levelRequired)

      expect(
        unlockedAt / total,
        `${skill.name}'s last action unlocks ${unlockedAt.toFixed(0)}h into ${total.toFixed(0)}h`,
      ).toBeGreaterThan(0.25)
    })

    it(`${skill.name} has something new inside the first half hour`, () => {
      // Early progress has to feel quick or nobody reaches the interesting part.
      const second = [...skill.actions].sort((a, b) => a.levelRequired - b.levelRequired)[1]
      expect(second).toBeDefined()
      expect(hoursAtLevel(skill, second!.levelRequired)).toBeLessThan(0.5)
    })

    it(`${skill.name} has no dead tiers`, () => {
      // Every action must beat the one before it, or it is a trap with no upside.
      const byLevel = [...skill.actions].sort((a, b) => a.levelRequired - b.levelRequired)
      for (let i = 1; i < byLevel.length; i++) {
        const prev = byLevel[i - 1]!
        const next = byLevel[i]!
        expect(
          next.xp / next.duration,
          `${skill.id}: ${next.id} is no better than ${prev.id}`,
        ).toBeGreaterThan(prev.xp / prev.duration)
        expect(next.levelRequired).toBeGreaterThan(prev.levelRequired)
      }
    })
  }

  it('reaches level 2 within a couple of minutes', () => {
    for (const skill of gathering) {
      expect(hoursAtLevel(skill, 2) * 60, `${skill.name} first level-up`).toBeLessThan(3)
    }
  })
})

describe('unlockable speed-ups', () => {
  it('arms make non-combat work faster', () => {
    const bare = newGame()
    expect(derivedStats(bare).skillDurationScale).toBe(1)

    const kitted = newGame()
    kitted.bank['arms_precision'] = 1
    expect(equipItem(kitted, 'arms_precision')).toBeNull()

    const scale = derivedStats(kitted).skillDurationScale
    expect(scale).toBeLessThan(1)
    // 25% faster means actions take 1/1.25 of the time, not 0.75.
    expect(scale).toBeCloseTo(1 / 1.25, 5)
  })

  it('legs make travel faster', () => {
    const bare = derivedStats(newGame()).moveSpeed

    const kitted = newGame()
    kitted.bank['legs_thruster'] = 1
    equipItem(kitted, 'legs_thruster')
    expect(derivedStats(kitted).moveSpeed).toBeGreaterThan(bare)
  })

  it('a fully kitted player beats the baseline by a worthwhile margin', () => {
    const kitted = newGame()
    kitted.bank['arms_precision'] = 1
    equipItem(kitted, 'arms_precision')

    const scale = derivedStats(kitted).skillDurationScale
    const baseline = TARGET_HOURS
    const improved = baseline * scale

    // Worth chasing, but not so strong it collapses the month.
    expect(baseline - improved).toBeGreaterThan(60)
    expect(improved).toBeGreaterThan(300)
  })
})
