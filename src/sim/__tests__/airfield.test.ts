import { describe, it, expect } from 'vitest'
import { getEnemy, activePhase } from '../../content/enemies'
import { getNode } from '../../content/world'
import { newGame, recordDefeat, type GameState } from '../state'
import { equipItem } from '../equipment'
import { derivedStats } from '../stats'
import { startCombat } from '../intents'
import { tick } from '../tick'
import { isNodeOpen } from '../world'
import { xpForLevel } from '../xp'

function kitted(weapon: string, level: number, frame = 'frame_titanium'): GameState {
  const state = newGame(99)
  for (const skill of ['attack', 'strength', 'defence', 'hitpoints'] as const) {
    state.skills[skill] = xpForLevel(level)
  }
  state.actors.mech.at = 'terminal_c'
  recordDefeat(state, 'overseer')
  recordDefeat(state, 'quartermaster')
  for (const part of [weapon, frame, 'legs_thruster', 'arms_precision', 'reactor_cell']) {
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

describe('the regions chain', () => {
  it('opens the airfield only once the Quartermaster falls', () => {
    const fresh = newGame()
    expect(isNodeOpen(fresh, 'runway')).toBe(false)

    const coastCleared = newGame()
    recordDefeat(coastCleared, 'overseer')
    expect(isNodeOpen(coastCleared, 'shallows')).toBe(true)
    // The Overseer opens the coast, not the airfield.
    expect(isNodeOpen(coastCleared, 'runway')).toBe(false)

    recordDefeat(coastCleared, 'quartermaster')
    expect(isNodeOpen(coastCleared, 'runway')).toBe(true)
  })

  it('gates every airfield place on the same boss', () => {
    for (const id of ['hangars', 'runway', 'terminal_c', 'approach_lights']) {
      expect(getNode(id)?.unlockedBy, `${id}`).toBe('quartermaster')
    }
  })
})

describe('equipment evasion', () => {
  it('adds to the evasion that opposes accuracy', () => {
    const bare = derivedStats(newGame()).evasion
    const light = newGame()
    light.bank['frame_aeroshell'] = 1
    equipItem(light, 'frame_aeroshell')
    expect(derivedStats(light).evasion).toBe(bare + 46)
  })

  it('makes a light frame harder to hit than a heavy one', () => {
    const heavy = newGame()
    heavy.bank['frame_titanium'] = 1
    equipItem(heavy, 'frame_titanium')

    const light = newGame()
    light.bank['frame_aeroshell'] = 1
    equipItem(light, 'frame_aeroshell')

    expect(derivedStats(light).evasion).toBeGreaterThan(derivedStats(heavy).evasion)
    // ...and pays for it in everything else.
    expect(derivedStats(light).maxHp).toBeLessThan(derivedStats(heavy).maxHp)
    expect(derivedStats(light).armour).toBeLessThan(derivedStats(heavy).armour)
  })
})

/**
 * Weapon damage is multiplicative, not flat.
 *
 * Flat weapon damage is swamped by level scaling - a +34 bonus is +45% at level 60 and
 * +28% at 99 - while attackSpeed is a share of a fixed base and never decays. That made
 * cadence the only weapon stat that mattered and turned slow weapons into traps.
 */
describe('weapon damage holds its value at every level', () => {
  const damageWith = (weapon: string, level: number) => {
    const s = newGame()
    for (const k of ['attack', 'strength', 'defence', 'hitpoints'] as const) s.skills[k] = xpForLevel(level)
    s.bank[weapon] = 1
    equipItem(s, weapon)
    return derivedStats(s).damage
  }

  it('keeps the same proportional advantage at 20 as at 99', () => {
    const bare = (level: number) => {
      const s = newGame()
      for (const k of ['attack', 'strength', 'defence', 'hitpoints'] as const) s.skills[k] = xpForLevel(level)
      return derivedStats(s).damage
    }
    const lowRatio = damageWith('weapon_harpoon', 20) / bare(20)
    const highRatio = damageWith('weapon_harpoon', 99) / bare(99)
    expect(highRatio).toBeCloseTo(lowRatio, 6)
  })

  it('multiplies rather than adds', () => {
    const s = newGame()
    s.skills.strength = xpForLevel(50)
    const before = derivedStats(s).damage
    s.bank['weapon_harpoon'] = 1
    equipItem(s, 'weapon_harpoon')
    expect(derivedStats(s).damage).toBeCloseTo(before * 2.25, 4)
  })
})

describe('Tower Actual', () => {
  const tower = getEnemy('tower_actual')!

  it('changes how hard it is to hit rather than what hurts it', () => {
    // Every other boss asks "which weapon". This one asks whether you can land
    // anything, then whether you survive it committing.
    const holding = activePhase(tower, tower.maxHp * 0.5)!
    const final = activePhase(tower, tower.maxHp * 0.1)!

    expect(holding.evasionMultiplier).toBeGreaterThan(1)
    expect(holding.damageMultiplier).toBeLessThan(1)
    expect(final.evasionMultiplier).toBeLessThan(1)
    expect(final.damageMultiplier).toBeGreaterThan(1)
  })

  it('is beatable with a full kit, and not before', () => {
    // The guarantee that matters: this boss must be winnable. Measured, because
    // "too hard" and "trivially easy" look identical in a content table.
    const won = tickBy(startCombat(kitted('weapon_pulse', 85), 'abandoned_airfield', 'tower_actual'), 5400, 0.5)
    expect(won.defeated['tower_actual'] ?? 0).toBeGreaterThan(0)
  })

  it('destroys an underlevelled mech', () => {
    // Level 50 clears the zone's level 45 gate but is nowhere near enough to win -
    // level 30 would have halted on the gate and never reached the fight.
    const outmatched = tickBy(startCombat(kitted('weapon_pulse', 50), 'abandoned_airfield', 'tower_actual'), 1800, 0.5)
    expect(outmatched.defeated['tower_actual'] ?? 0).toBe(0)
    expect(outmatched.actors.mech.stoppedReason).toBe('destroyed')
  })
})
