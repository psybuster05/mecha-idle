import { describe, it, expect } from 'vitest'
import { newGame, recordDefeat, type GameState } from '../state'
import { equipItem } from '../equipment'
import { derivedStats } from '../stats'
import { startCombat, stopActivity } from '../intents'
import { tick } from '../tick'
import { getEnemy } from '../../content/enemies'
import { xpForLevel } from '../xp'

function kitted(weapon: string, level = 90): GameState {
  const state = newGame(99)
  for (const skill of ['attack', 'strength', 'defence', 'hitpoints'] as const) {
    state.skills[skill] = xpForLevel(level)
  }
  state.actors.mech.at = 'checkpoint'
  recordDefeat(state, 'overseer')
  recordDefeat(state, 'quartermaster')
  for (const part of [weapon, 'frame_titanium', 'legs_thruster', 'arms_precision', 'reactor_cell']) {
    state.bank[part] = 1
    expect(equipItem(state, part)).toBeNull()
  }
  return state
}

function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
}

function killsOf(state: GameState, enemyId: string, level: number): number {
  return (state.skills.attack - xpForLevel(level)) / getEnemy(enemyId)!.xp
}

describe('the cleave stat', () => {
  it('is zero unless something grants it', () => {
    expect(derivedStats(newGame()).cleave).toBe(0)
    expect(derivedStats(kitted('weapon_repeater')).cleave).toBe(0)
  })

  it('comes from the weapon and is clamped to a fraction', () => {
    const cleaving = derivedStats(kitted('weapon_harpoon')).cleave
    expect(cleaving).toBeGreaterThan(0)
    expect(cleaving).toBeLessThanOrEqual(1)
  })
})

/**
 * The archetype, measured.
 *
 * Slow heavy weapons used to lose everywhere: a 255-damage hit into a 130 HP drone
 * threw away half of itself, and enemies mostly die in one to three hits, so cadence
 * dominated. Cleave turns that waste into the identity - and it self-balances, because
 * carrying overkill cannot help against a single large target.
 */
describe('cleave gives slow weapons a real niche', () => {
  const LEVEL = 90

  it('shreds small enemies that a fast weapon cannot keep up with', () => {
    const cleaver = tickBy(startCombat(kitted('weapon_harpoon', LEVEL), 'rustbelt', 'scrap_crawler'), 1800, 0.5)
    const fast = tickBy(startCombat(kitted('weapon_repeater', LEVEL), 'rustbelt', 'scrap_crawler'), 1800, 0.5)

    expect(killsOf(cleaver, 'scrap_crawler', LEVEL)).toBeGreaterThan(
      killsOf(fast, 'scrap_crawler', LEVEL) * 1.3,
    )
  })

  it('loses that edge as targets get large enough to absorb a full hit', () => {
    const cleaver = tickBy(startCombat(kitted('weapon_harpoon', LEVEL), 'abandoned_airfield', 'baggage_hauler'), 1800, 0.5)
    const fast = tickBy(startCombat(kitted('weapon_repeater', LEVEL), 'abandoned_airfield', 'baggage_hauler'), 1800, 0.5)

    const ratio = killsOf(cleaver, 'baggage_hauler', LEVEL) / killsOf(fast, 'baggage_hauler', LEVEL)
    // Comparable, not dominant - a 380 HP enemy wastes little of a big hit either way.
    expect(ratio).toBeGreaterThan(0.8)
    expect(ratio).toBeLessThan(1.2)
  })
})

describe('banked overkill', () => {
  it('never accumulates beyond a single hit', () => {
    // It is spent the moment the next enemy arrives, so it cannot be stockpiled.
    let state = startCombat(kitted('weapon_harpoon'), 'rustbelt', 'scrap_crawler')
    const cap = derivedStats(state).damage * 1.25

    for (let i = 0; i < 600; i++) {
      state = tick(state, 0.5)
      expect(state.combat.carryOver).toBeLessThanOrEqual(cap)
      expect(state.combat.carryOver).toBeGreaterThanOrEqual(0)
    }
  })

  it('is discarded when the engagement ends', () => {
    let state = tickBy(startCombat(kitted('weapon_harpoon'), 'rustbelt', 'scrap_crawler'), 60, 0.5)
    state = stopActivity(state)
    state = startCombat(state, 'rustbelt', 'reclaimer')
    expect(state.combat.carryOver).toBe(0)
  })

  it('is discarded on destruction', () => {
    const doomed = tickBy(startCombat(kitted('weapon_harpoon', 20), 'abandoned_airfield', 'baggage_hauler'), 3600, 0.5)
    if (doomed.actors.mech.stoppedReason === 'destroyed') {
      expect(doomed.combat.carryOver).toBe(0)
    }
  })

  it('a carried kill still costs the respawn delay', () => {
    // Otherwise chaining would skip time entirely and clear a zone instantly.
    const state = tickBy(startCombat(kitted('weapon_harpoon'), 'rustbelt', 'scrap_crawler'), 3600, 0.5)
    const kills = killsOf(state, 'scrap_crawler', 90)
    expect(kills).toBeLessThanOrEqual(3600 / 2)
  })
})

describe('cleave and the offline guarantee', () => {
  it('keeps one big step equal to many small ones', () => {
    // Carried damage is deterministic and consumes no RNG, so the equivalence that
    // makes offline exact has to survive it.
    const make = () => startCombat(kitted('weapon_harpoon'), 'rustbelt', 'scrap_crawler')
    const bulk = tick(make(), 1800)
    const incremental = tickBy(make(), 1800, 0.25)

    expect(incremental.skills).toEqual(bulk.skills)
    expect(incremental.bank).toEqual(bulk.bank)
    expect(incremental.rngSeed).toBe(bulk.rngSeed)
    expect(incremental.combat.carryOver).toBeCloseTo(bulk.combat.carryOver, 6)
  })

  it('is filled in for saves written before it existed', () => {
    const state = newGame()
    expect(state.combat.carryOver).toBe(0)
  })
})
