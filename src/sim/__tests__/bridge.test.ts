import { describe, it, expect } from 'vitest'
import { getEnemy, activePhase } from '../../content/enemies'
import { getNode } from '../../content/world'
import { newGame, recordDefeat, type GameState } from '../state'
import { equipItem } from '../equipment'
import { derivedStats, HP_REGEN_PER_SECOND } from '../stats'
import { startCombat, startSkillAction } from '../intents'
import { tick } from '../tick'
import { isNodeOpen } from '../world'
import { xpForLevel } from '../xp'

function kitted(weapon: string, level: number): GameState {
  const state = newGame(99)
  for (const skill of ['attack', 'strength', 'defence', 'hitpoints'] as const) {
    state.skills[skill] = xpForLevel(level)
  }
  state.actors.mech.at = 'the_span'
  for (const boss of ['overseer', 'quartermaster', 'tower_actual']) recordDefeat(state, boss)
  for (const part of [weapon, 'frame_bulwark', 'legs_thruster', 'arms_precision', 'reactor_cell']) {
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

describe('the chain reaches the bridge', () => {
  it('opens only once Tower Actual falls', () => {
    const state = newGame()
    recordDefeat(state, 'overseer')
    recordDefeat(state, 'quartermaster')
    expect(isNodeOpen(state, 'the_span')).toBe(false)
    recordDefeat(state, 'tower_actual')
    expect(isNodeOpen(state, 'the_span')).toBe(true)
  })

  it('gates all three crossing points on the same boss', () => {
    for (const id of ['south_approach', 'the_span', 'north_gatehouse']) {
      expect(getNode(id)?.unlockedBy, id).toBe('tower_actual')
    }
  })
})

/**
 * Armour finally matters here, so penetration finally has something to answer.
 *
 * Mitigation is multiplicative, so hitting harder scales alongside armour and never
 * beats it - a heavily plated enemy is simply one with more effective HP. Penetration
 * is the only stat that actually replies.
 */
describe('armour penetration', () => {
  it('is zero unless a weapon grants it', () => {
    expect(derivedStats(kitted('weapon_pulse', 90)).armourPierce).toBe(0)
    expect(derivedStats(kitted('weapon_lance', 90)).armourPierce).toBeGreaterThan(0)
  })

  it('never reaches total, so armour is always worth something', () => {
    expect(derivedStats(kitted('weapon_lance', 90)).armourPierce).toBeLessThanOrEqual(0.9)
  })

  it('matters more the more armour the target carries', () => {
    const LEVEL = 90
    const kills = (weapon: string, zone: string, target: string) => {
      const state = tickBy(startCombat(kitted(weapon, LEVEL), zone, target), 1800, 0.5)
      return (state.skills.attack - xpForLevel(LEVEL)) / getEnemy(target)!.xp
    }

    // Riot Column carries 145 armour; a Scrap Crawler carries none.
    const heavyAdvantage = kills('weapon_lance', 'bridge_checkpoint', 'riot_column') /
      kills('weapon_pulse', 'bridge_checkpoint', 'riot_column')
    const lightAdvantage = kills('weapon_lance', 'rustbelt', 'scrap_crawler') /
      kills('weapon_pulse', 'rustbelt', 'scrap_crawler')

    expect(heavyAdvantage).toBeGreaterThan(1.3)
    // And against unarmoured targets the piercing weapon has no edge at all.
    expect(lightAdvantage).toBeLessThan(1.1)
  })
})

describe('The Registrar', () => {
  const boss = getEnemy('registrar')!

  it('turtles in the middle and abandons its armour at the end', () => {
    const lockdown = activePhase(boss, boss.maxHp * 0.4)!
    const denial = activePhase(boss, boss.maxHp * 0.1)!
    expect(lockdown.armourMultiplier!).toBeGreaterThan(1)
    expect(denial.armourMultiplier!).toBeLessThan(1)
    expect(denial.damageMultiplier!).toBeGreaterThan(lockdown.damageMultiplier!)
  })

  it('falls to a piercing weapon at level 85', () => {
    let state = startCombat(kitted('weapon_lance', 85), 'bridge_checkpoint', 'registrar')
    state = tickBy(state, 3600, 0.5)
    expect(state.defeated['registrar'] ?? 0).toBeGreaterThan(0)
  })

  it('does not fall to a non-piercing one at the same level', () => {
    // The zone's whole lesson: bring the answer to armour, or do not come.
    let state = startCombat(kitted('weapon_pulse', 85), 'bridge_checkpoint', 'registrar')
    state = tickBy(state, 3600, 0.5)
    expect(state.defeated['registrar'] ?? 0).toBe(0)
  })
})

/**
 * Regeneration, which the GDD asked for and the Registrar forced.
 *
 * Heal-on-kill never fires during a boss fight, so without regeneration any fight
 * lasting longer than maxHP / incoming DPS was unwinnable regardless of damage - a hard
 * ceiling of about 140 seconds at level 99, against a boss needing 470.
 */
describe('reactor regeneration', () => {
  it('patches you up between sorties', () => {
    const state = newGame()
    state.skills.hitpoints = xpForLevel(50)
    const max = derivedStats(state).maxHp
    state.combat.hp = max / 2

    const after = tick(state, 60)
    expect(after.combat.hp).toBeGreaterThan(max / 2)
    expect(after.combat.hp).toBeCloseTo(max / 2 + max * HP_REGEN_PER_SECOND * 60, 4)
  })

  it('never overfills', () => {
    const state = newGame()
    state.combat.hp = derivedStats(state).maxHp
    const after = tick(state, 10_000)
    expect(after.combat.hp).toBe(derivedStats(after).maxHp)
  })

  it('does not double-count while fighting', () => {
    // Combat regenerates inside its own event loop so healing interleaves with hits.
    // Applying it in the outer tick as well would heal twice per second.
    const fighting = tickBy(startCombat(kitted('weapon_lance', 90), 'bridge_checkpoint', 'barrier_drone'), 30, 0.5)
    expect(fighting.combat.hp).toBeLessThanOrEqual(derivedStats(fighting).maxHp)
  })

  it('keeps one big step equal to many small ones', () => {
    const make = () => {
      const s = newGame(7)
      s.skills.hitpoints = xpForLevel(60)
      s.combat.hp = 100
      return startSkillAction(s, 'scavenging', 'roadside_wrecks')
    }
    const bulk = tick(make(), 600)
    const incremental = tickBy(make(), 600, 0.25)
    expect(incremental.combat.hp).toBeCloseTo(bulk.combat.hp, 6)
    expect(incremental.bank).toEqual(bulk.bank)
  })
})
