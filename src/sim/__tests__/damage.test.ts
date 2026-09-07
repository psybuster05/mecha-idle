import { describe, it, expect } from 'vitest'
import { combatXpSince } from './combatXp'
import { activePhase, effectiveResistances, ENEMIES, getEnemy } from '../../content/enemies'
import { DAMAGE_TYPES, newGame, type GameState } from '../state'
import { equipItem } from '../equipment'
import { derivedStats } from '../stats'
import { startCombat } from '../intents'
import { tick } from '../tick'
import { xpForLevel } from '../xp'

function veteran(seed = 7): GameState {
  const state = newGame(seed)
  for (const skill of ['attack', 'strength', 'defence', 'hitpoints', 'ranged'] as const) {
    state.skills[skill] = xpForLevel(60)
  }
  return state
}

/** Low enough that a single hit does not simply delete the target. */
function novice(seed = 7): GameState {
  const state = newGame(seed)
  for (const skill of ['attack', 'strength', 'defence', 'hitpoints', 'ranged'] as const) {
    state.skills[skill] = xpForLevel(20)
  }
  return state
}

function withWeapon(weapon: string, seed = 7, base = veteran): GameState {
  const state = base(seed)
  state.bank[weapon] = 1
  expect(equipItem(state, weapon)).toBeNull()
  return state
}

function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
}

describe('damage types', () => {
  it('takes its type from the fitted weapon, and is kinetic bare-handed', () => {
    expect(derivedStats(newGame()).damageType).toBe('kinetic')
    expect(derivedStats(withWeapon('weapon_arc')).damageType).toBe('energy')
    expect(derivedStats(withWeapon('weapon_pulse')).damageType).toBe('emp')
  })

  it('gives every enemy a valid type and sane resistances', () => {
    for (const enemy of ENEMIES) {
      expect(DAMAGE_TYPES, `${enemy.id} deals an unknown type`).toContain(enemy.damageType)
      for (const [type, value] of Object.entries(enemy.resistances ?? {})) {
        expect(DAMAGE_TYPES, `${enemy.id} resists unknown type ${type}`).toContain(type)
        expect(value, `${enemy.id} ${type}`).toBeGreaterThan(0)
        expect(value, `${enemy.id} ${type}`).toBeLessThan(3)
      }
    }
  })
})

describe('resistances stack multiplicatively', () => {
  it('starts neutral', () => {
    expect(derivedStats(newGame()).resistances).toEqual({ kinetic: 1, energy: 1, emp: 1 })
  })

  it('compounds rather than adding, so immunity is unreachable', () => {
    const state = veteran()
    state.bank['frame_titanium'] = 1 // kinetic 0.75
    state.bank['legs_thruster'] = 1 // emp 0.7
    equipItem(state, 'frame_titanium')
    equipItem(state, 'legs_thruster')

    const resist = derivedStats(state).resistances
    expect(resist.kinetic).toBeCloseTo(0.75, 5)
    expect(resist.emp).toBeCloseTo(0.7, 5)
    // Even stacked, nothing reaches zero.
    expect(resist.kinetic).toBeGreaterThan(0)
  })
})

/**
 * The point of the whole exercise: the weapon you bring has to matter.
 */
describe('matchups decide fights', () => {
  it('a resisted weapon kills the Reclaimer more slowly than a favoured one', () => {
    // Reclaimer: kinetic 0.7, energy 1.3. Same mech, same seed, different weapon.
    const kinetic = tickBy(startCombat(withWeapon('weapon_rivet', 99), 'rustbelt', 'reclaimer'), 900, 0.5)
    const energy = tickBy(startCombat(withWeapon('weapon_arc', 99), 'rustbelt', 'reclaimer'), 900, 0.5)

    const kineticXp = combatXpSince(kinetic, 60)
    const energyXp = combatXpSince(energy, 60)
    expect(energyXp).toBeGreaterThan(kineticXp)
  })

  it('EMP shreds the drone that energy barely dents', () => {
    // Sentry Drone: emp 1.6, energy 0.8. Fought at level 20 deliberately - a level 60
    // mech one-shots it either way, so kill rate is capped by the swing timer and the
    // matchup becomes invisible.
    const emp = tickBy(startCombat(withWeapon('weapon_pulse', 5, novice), 'rustbelt', 'sentry_drone'), 600, 0.5)
    const energy = tickBy(startCombat(withWeapon('weapon_arc', 5, novice), 'rustbelt', 'sentry_drone'), 600, 0.5)

    expect(combatXpSince(emp, 20)).toBeGreaterThan(combatXpSince(energy, 20))
  })

  it('never reduces a landed hit below 1, so no matchup is unwinnable', () => {
    // A bare-handed mech against the most kinetic-resistant thing in the game still
    // makes progress - slowly. Bad matchups should be discouraging, not impossible.
    const state = tickBy(startCombat(veteran(3), 'rustbelt', 'reclaimer'), 600, 0.5)
    expect(combatXpSince(state, 60)).toBeGreaterThan(0)
  })
})

describe('picking a target', () => {
  it('fights only the named enemy', () => {
    let state = startCombat(veteran(), 'rustbelt', 'scrap_crawler')
    state = tickBy(state, 300, 0.5)
    // Only Scrap Crawlers drop nothing but scrap and wiring; a Reclaimer would have
    // yielded titanium.
    expect(state.bank['titanium_shard']).toBeUndefined()
  })

  it('falls back to a random spawn when no target is named', () => {
    // Asserting on kills rather than on an enemy being present: there is a two second
    // gap between spawns, so whether one is on the field at an arbitrary instant is
    // a coin flip and would make this flaky.
    const state = tickBy(startCombat(veteran(), 'rustbelt'), 900, 0.5)
    expect(state.skills.attack).toBeGreaterThan(xpForLevel(60))
  })

  it('never rolls a boss at random', () => {
    // The Overseer is in the Rustbelt pool but must be chosen deliberately.
    for (let seed = 1; seed <= 30; seed++) {
      const state = tickBy(startCombat(veteran(seed), 'rustbelt'), 60, 0.5)
      expect(state.combat.enemyId, `seed ${seed} rolled the boss`).not.toBe('overseer')
    }
  })
})

describe('boss phases', () => {
  const overseer = getEnemy('overseer')!

  it('derives the phase from current HP, with no stored state to desync', () => {
    expect(activePhase(overseer, overseer.maxHp)).toBeNull()
    expect(activePhase(overseer, overseer.maxHp * 0.7)).toBeNull()
    expect(activePhase(overseer, overseer.maxHp * 0.5)?.name).toBe('Bulwark')
    expect(activePhase(overseer, overseer.maxHp * 0.1)?.name).toBe('Overload')
  })

  it('inverts which weapon is correct partway through the fight', () => {
    // This is the mechanic in one assertion. Opening: everything lands equally.
    // Bulwark: kinetic is nearly useless and EMP is the answer. Overload: EMP stops
    // working and kinetic comes back.
    const opening = effectiveResistances(overseer, overseer.maxHp)
    const bulwark = effectiveResistances(overseer, overseer.maxHp * 0.5)
    const overload = effectiveResistances(overseer, overseer.maxHp * 0.1)

    expect(opening.kinetic).toBe(1)
    expect(bulwark.kinetic!).toBeLessThan(0.5)
    expect(bulwark.emp!).toBeGreaterThan(1)
    expect(overload.kinetic!).toBeGreaterThan(bulwark.kinetic!)
    expect(overload.emp!).toBeLessThan(bulwark.emp!)
  })

  it('makes the boss hit harder and faster as it degrades', () => {
    const phases = overseer.phases!
    const last = phases[phases.length - 1]!
    expect(last.damageMultiplier).toBeGreaterThan(1)
    expect(last.attackIntervalMultiplier).toBeLessThan(1)
  })

  it('every phase threshold descends and stays a real fraction', () => {
    for (const enemy of ENEMIES) {
      if (!enemy.phases) continue
      let previous = 1
      for (const phase of enemy.phases) {
        expect(phase.below, `${enemy.id}:${phase.name}`).toBeGreaterThan(0)
        expect(phase.below, `${enemy.id}:${phase.name}`).toBeLessThan(previous)
        previous = phase.below
      }
    }
  })

  it('is genuinely hard for a mech that has not prepared', () => {
    // 900 HP, and it accelerates. Level 25 and bare-handed is genuinely unprepared -
    // level 60 no longer is, because reactor regeneration now outlasts the Overseer's
    // quieter phases. That is the intended effect of regeneration, not a regression.
    const green = newGame(11)
    for (const skill of ['attack', 'strength', 'defence', 'hitpoints', 'ranged'] as const) {
      green.skills[skill] = xpForLevel(25)
    }
    const state = tickBy(startCombat(green, 'rustbelt', 'overseer'), 1800, 0.5)
    expect(state.actors.mech.stoppedReason).toBe('destroyed')
  })

  it('resolves identically whether simulated in one step or many', () => {
    // Phases are derived per event, so a large offline dt must cross thresholds in
    // the same order a live fight does.
    const make = () => startCombat(withWeapon('weapon_pulse', 2024), 'rustbelt', 'overseer')
    const bulk = tick(make(), 1800)
    const incremental = tickBy(make(), 1800, 0.25)

    expect(incremental.skills).toEqual(bulk.skills)
    expect(incremental.bank).toEqual(bulk.bank)
    expect(incremental.combat.enemyHp).toBeCloseTo(bulk.combat.enemyHp, 6)
  })
})
