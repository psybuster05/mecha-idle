import { describe, it, expect } from 'vitest'
import { killsSince } from './combatXp'
import { getEnemy, activePhase } from '../../content/enemies'
import { getZone } from '../../content'
import { getNode } from '../../content/world'
import { newGame, recordDefeat, type GameState } from '../state'
import { equipItem } from '../equipment'
import { RESPAWN_DELAY } from '../stats'
import { startCombat } from '../intents'
import { tick } from '../tick'
import { isNodeOpen } from '../world'
import { xpForLevel } from '../xp'

function kitted(weapon: string, level: number): GameState {
  const state = newGame(99)
  for (const skill of ['attack', 'strength', 'defence', 'hitpoints', 'ranged'] as const) {
    state.skills[skill] = xpForLevel(level)
  }
  state.actors.mech.at = 'the_works'
  for (const boss of ['overseer', 'quartermaster', 'tower_actual', 'registrar']) {
    recordDefeat(state, boss)
  }
  for (const part of [weapon, 'frame_bulwark', 'legs_thruster', 'arms_labour', 'reactor_grid']) {
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

function killsIn(weapon: string, target: string, seconds: number, level = 90): number {
  const state = tickBy(startCombat(kitted(weapon, level), 'the_city', target), seconds, 0.5)
  return killsSince(state, level, getEnemy(target)!.xp)
}

describe('the chain reaches the mainland', () => {
  it('opens the city only once the Registrar falls', () => {
    const state = newGame()
    for (const boss of ['overseer', 'quartermaster', 'tower_actual']) recordDefeat(state, boss)
    expect(isNodeOpen(state, 'outer_wards')).toBe(false)
    recordDefeat(state, 'registrar')
    expect(isNodeOpen(state, 'outer_wards')).toBe(true)
  })

  it('gates every city district on the same boss', () => {
    for (const id of ['outer_wards', 'the_works', 'transit_rings', 'census_hall']) {
      expect(getNode(id)?.unlockedBy, id).toBe('registrar')
    }
  })
})

/**
 * A crowd, in a model that only ever fights one thing at a time.
 *
 * Two things together make it read as one: almost no gap between arrivals, and enemies
 * weak enough to fall in a single hit. The respawn timer alone was not enough - at 240
 * HP a big swing left no overkill to carry, so "swarm" was just a faster queue.
 */
describe('the crowd', () => {
  it('steps forward far faster than anywhere else', () => {
    expect(getZone('the_city')!.respawnDelay!).toBeLessThan(RESPAWN_DELAY)
    expect(getZone('rustbelt')!.respawnDelay).toBeUndefined()
  })

  it('rewards cleave, which the checkpoint had retired', () => {
    const cleaving = killsIn('weapon_harpoon', 'work_unit', 1800)
    const fast = killsIn('weapon_repeater', 'work_unit', 1800)
    expect(cleaving).toBeGreaterThan(fast)
  })

  it('stops rewarding it once targets are big enough to absorb a hit', () => {
    const cleaving = killsIn('weapon_harpoon', 'transit_marshal', 1800)
    const fast = killsIn('weapon_repeater', 'transit_marshal', 1800)
    expect(cleaving).toBeLessThan(fast)
  })

  it('pays less per kill than anywhere before it', () => {
    // They own nothing. Volume is the whole point, not value.
    expect(getEnemy('work_unit')!.xp).toBeLessThan(getEnemy('riot_column')!.xp)
    expect(getEnemy('work_unit')!.maxHp).toBeLessThan(getEnemy('barrier_drone')!.maxHp)
  })
})

/**
 * Recount is a damage floor, not a longer fight.
 *
 * Every phase before this asked what to bring. This one asks whether it is enough:
 * below the threshold the boss heals faster than you hurt it and you can never finish,
 * however long you stay.
 */
describe('The Census', () => {
  const census = getEnemy('census')!

  it('heals during Recount and stops for the tally', () => {
    const recount = activePhase(census, census.maxHp * 0.4)!
    const tally = activePhase(census, census.maxHp * 0.1)!
    expect(recount.regenPerSecond!).toBeGreaterThan(0)
    expect(tally.regenPerSecond).toBe(0)
    expect(tally.damageMultiplier!).toBeGreaterThan(recount.damageMultiplier!)
  })

  it('sets the threshold below reachable damage, not above it', () => {
    // 0.0075 of 16,000 was 120 hp/s against a realistic 30 - a brick no build could
    // pass. A wall has to be climbable by someone.
    const healPerSecond = census.maxHp * activePhase(census, census.maxHp * 0.4)!.regenPerSecond!
    expect(healPerSecond).toBeLessThan(20)
    expect(healPerSecond).toBeGreaterThan(5)
  })

  it('actually regenerates mid-fight', () => {
    let state = startCombat(kitted('weapon_pulse', 80), 'the_city', 'census')
    state = tickBy(state, 600, 0.5)
    // A level 80 mech cannot out-damage the recount, so it stalls above zero forever.
    expect(state.defeated['census'] ?? 0).toBe(0)
  })

  it('falls at level 90 to the right weapon', () => {
    const won = tickBy(startCombat(kitted('weapon_lance', 90), 'the_city', 'census'), 3600, 0.5)
    expect(won.defeated['census'] ?? 0).toBeGreaterThan(0)
  })

  it('does not fall to the crowd weapon', () => {
    // The Harpoon owns the wards and cannot touch the hall. Different tools for the
    // crowd and the crown.
    const lost = tickBy(startCombat(kitted('weapon_harpoon', 90), 'the_city', 'census'), 3600, 0.5)
    expect(lost.defeated['census'] ?? 0).toBe(0)
  })
})

describe('enemy regeneration and the offline guarantee', () => {
  it('keeps one big step equal to many small ones', () => {
    const make = () => startCombat(kitted('weapon_lance', 90), 'the_city', 'census')
    const bulk = tick(make(), 900)
    const incremental = tickBy(make(), 900, 0.25)
    expect(incremental.combat.enemyHp).toBeCloseTo(bulk.combat.enemyHp, 4)
    expect(incremental.skills).toEqual(bulk.skills)
  })
})
