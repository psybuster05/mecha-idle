import { describe, it, expect } from 'vitest'
import { SKILLS } from '../index'
import { nodesForAction } from '../world'
import type { SkillDef } from '../types'
import { MAX_LEVEL, xpForLevel } from '../../sim/xp'
import { newGame } from '../../sim/state'
import { DEMO_PACE } from '../../sim/pace'
import { startCombat } from '../../sim/intents'
import { advance } from '../../sim/tick'
import { combatLevel } from '../../sim/stats'
import { ZONES } from '../zones'
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
      // Every level threshold must raise the best rate available. Several actions may
      // share a threshold - those are sidegrades, like weapons of different damage
      // types - so the check is per threshold, not per action.
      const thresholds = [...new Set(skill.actions.map((a) => a.levelRequired))].sort(
        (a, b) => a - b,
      )
      for (let i = 1; i < thresholds.length; i++) {
        const level = thresholds[i]!
        const previous = thresholds[i - 1]!
        expect(
          bestRate(skill, level),
          `${skill.id}: level ${level} is no better than level ${previous}`,
        ).toBeGreaterThan(bestRate(skill, previous))
      }
    })

    it(`${skill.name} has no strictly worse action at any threshold`, () => {
      // A sidegrade is fine; a pure downgrade at the same level is a trap. Anything
      // sharing a threshold must at least match the best rate there.
      for (const action of skill.actions) {
        const best = bestRate(skill, action.levelRequired)
        const rate = action.xp / action.duration
        expect(
          rate / best,
          `${skill.id}: ${action.id} is much worse than its level-mates`,
        ).toBeGreaterThan(0.75)
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

  it('legs make you harder to hit', () => {
    // Legs used to carry movement speed. Travel is gone, so what is left of being fast
    // is not being where the shot went.
    const bare = derivedStats(newGame()).evasion

    const kitted = newGame()
    kitted.bank['legs_thruster'] = 1
    equipItem(kitted, 'legs_thruster')
    expect(derivedStats(kitted).evasion).toBeGreaterThan(bare)
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

/**
 * The gating contract, measured rather than asserted by shape.
 *
 * Locked regions may hold gathering content - the Ship Graveyard does. What they may
 * never do is be *required* to max a skill. So: recompute the whole 1-99 curve using
 * only actions available somewhere unlocked, and check it still lands in the target
 * window. If a future zone ever quietly becomes the fast route to 99, this fails.
 */
describe('a complete ladder exists outside every lock', () => {
  for (const skill of SKILLS) {
    it(`${skill.name} reaches 99 at target pace without entering a locked region`, () => {
      const openOnly: typeof skill = {
        ...skill,
        actions: skill.actions.filter((action) =>
          nodesForAction(skill.id, action.id).some((node) => !node.unlockedBy),
        ),
      }
      const hours = hoursTo99(openOnly)
      expect(hours, `${skill.name} unlocked-only takes ${hours.toFixed(0)}h`).toBeGreaterThan(MIN_HOURS)
      expect(hours, `${skill.name} unlocked-only takes ${hours.toFixed(0)}h`).toBeLessThan(MAX_HOURS)
    })

    it(`${skill.name}'s locked content is lateral, not a shortcut`, () => {
      // Locked actions must not beat what is already available at their level, or the
      // fastest route to 99 ends up behind a boss after all.
      for (const action of skill.actions) {
        const locked = nodesForAction(skill.id, action.id).every((node) => node.unlockedBy)
        if (!locked) continue
        const openBest = Math.max(
          ...skill.actions
            .filter(
              (a) =>
                a.levelRequired <= action.levelRequired &&
                nodesForAction(skill.id, a.id).some((n) => !n.unlockedBy),
            )
            .map((a) => a.xp / a.duration),
        )
        expect(
          action.xp / action.duration,
          `${skill.id}:${action.id} is faster than anything unlocked at its level`,
        ).toBeLessThanOrEqual(openBest)
      }
    })
  }
})

/**
 * The demo pace.
 *
 * Everything above measures the *design*, in game time, and none of it knows `DEMO_PACE`
 * exists - which is the point of applying the dilation in the driver rather than in
 * `tick`. These two measure the thing the design cannot: what someone actually sees in
 * the fifteen minutes they will give a link from a friend.
 *
 * At 1x those fifteen minutes reached Scavenging 8 and combat level 4 - one region, no
 * boss, no crawler, no second region. The bounds below are what the pace was chosen to
 * buy, so lowering it is allowed to fail here rather than quietly shipping the loop
 * without the game.
 */
describe('what a visitor sees', () => {
  it('puts the crawler inside five minutes of working at it', () => {
    const fabrication = SKILLS.find((s) => s.id === 'fabrication')!
    // Fabrication 10 is the Traction Core, and the second actor is the clearest single
    // proof that this is a game with systems rather than one button.
    const minutes = (hoursAtLevel(fabrication, 10) * 60) / DEMO_PACE
    expect(minutes, `crawler at ${minutes.toFixed(1)} real minutes`).toBeLessThan(5)
  })

  it('opens the second region inside half an hour', () => {
    const graveyard = ZONES.find((z) => z.id === 'ship_graveyard')!
    // Fighting the weakest thing in the Rustbelt with starting gear: the slowest honest
    // route, and the one a visitor who never opens the equipment page is actually on.
    const state = startCombat(newGame(), 'rustbelt', 'scrap_crawler')
    let seconds = 0
    while (seconds < 40 * HOUR && combatLevel(state) < graveyard.levelRequired) {
      advance(state, 10)
      seconds += 10
      // Dying would end the run and quietly turn this into an assertion about nothing.
      expect(state.actors.mech.activity, 'destroyed before reaching the second region').not.toBeNull()
    }
    const minutes = seconds / 60 / DEMO_PACE
    expect(minutes, `second region at ${minutes.toFixed(0)} real minutes`).toBeLessThan(30)
  })
})
