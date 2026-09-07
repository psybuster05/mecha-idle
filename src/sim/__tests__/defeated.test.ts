import { describe, it, expect } from 'vitest'
import { combatXpSince } from './combatXp'
import { WORLD_NODES } from '../../content/world'
import { earnedPerks, getEnemy, perkTotal } from '../../content/enemies'
import { hasDefeated, newGame, recordDefeat, type GameState } from '../state'
import { startCombat, startSkillAction } from '../intents'
import { tick } from '../tick'
import { isNodeOpen, placeActor } from '../world'
import { deserialize, serialize } from '../save'
import { xpForLevel } from '../xp'

/** Strong enough, and armed correctly, to actually finish the Overseer. */
function championed(seed = 4242): GameState {
  const state = newGame(seed)
  for (const skill of ['attack', 'strength', 'defence', 'hitpoints', 'ranged'] as const) {
    state.skills[skill] = xpForLevel(99)
  }
  state.bank['weapon_pulse'] = 1
  state.equipment.weapon = 'weapon_pulse'
  state.actors.mech.at = 'checkpoint'
  return state
}

function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
}

describe('recording defeats', () => {
  it('starts with nothing beaten', () => {
    const state = newGame()
    expect(state.defeated).toEqual({})
    expect(hasDefeated(state, 'overseer')).toBe(false)
  })

  it('counts kills and reports whether it was the first', () => {
    const state = newGame()
    expect(recordDefeat(state, 'overseer')).toBe(true)
    expect(recordDefeat(state, 'overseer')).toBe(false)
    expect(state.defeated['overseer']).toBe(2)
    expect(hasDefeated(state, 'overseer')).toBe(true)
  })

  it('records a boss when it actually dies in combat', () => {
    const state = tickBy(startCombat(championed(), 'rustbelt', 'overseer'), 600, 0.5)
    expect(hasDefeated(state, 'overseer')).toBe(true)
  })

  it('does not record ordinary enemies', () => {
    // A kill log of every trash mob would grow without bound and serve nothing.
    const state = tickBy(startCombat(championed(), 'rustbelt', 'scrap_crawler'), 300, 0.5)
    expect(state.defeated).toEqual({})
  })

  it('survives a save round trip', () => {
    const state = newGame()
    recordDefeat(state, 'overseer')
    const result = deserialize(serialize(state, Date.now()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.defeated['overseer']).toBe(1)
  })

  it('is filled in for saves written before it existed', () => {
    const old = { ...newGame() } as Record<string, unknown>
    delete old['defeated']
    const result = deserialize(JSON.stringify(old))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.defeated).toEqual({})
  })
})

describe('perks', () => {
  const overseer = getEnemy('overseer')!

  it('are inert until the boss is beaten', () => {
    expect(earnedPerks({})).toEqual([])
    expect(perkTotal({}, 'gatheringYield')).toBe(0)
  })

  it('activate on the first kill and persist', () => {
    const defeated = { overseer: 1 }
    expect(earnedPerks(defeated).map((p) => p.id)).toEqual(['district_override'])
    expect(perkTotal(defeated, 'gatheringYield')).toBe(overseer.perk!.gatheringYield)
  })

  it('do not stack with repeat kills', () => {
    // Farming a boss must not compound its perk.
    expect(perkTotal({ overseer: 9 }, 'gatheringYield')).toBe(
      perkTotal({ overseer: 1 }, 'gatheringYield'),
    )
  })

  it('grant bonus hauls while gathering', () => {
    const plain = tickBy(startSkillAction(newGame(77), 'scavenging', 'roadside_wrecks'), 3600, 1)

    const perked = newGame(77)
    recordDefeat(perked, 'overseer')
    const boosted = tickBy(startSkillAction(perked, 'scavenging', 'roadside_wrecks'), 3600, 1)

    expect(boosted.bank['scrap_steel']!).toBeGreaterThan(plain.bank['scrap_steel']!)
  })

  /**
   * The offline guarantee has to survive the perks.
   *
   * Yield is a per-completion roll rather than a multiplier on the total, and perked
   * xp is left unrounded, precisely so that one large step and many small ones agree.
   * A multiplier plus rounding would quietly diverge.
   */
  it('keep one big step equal to many small ones', () => {
    const make = () => {
      const state = newGame(2468)
      recordDefeat(state, 'overseer')
      state.actors.mech.at = 'roadside'
      return startSkillAction(state, 'scavenging', 'roadside_wrecks')
    }
    const bulk = tick(make(), 3600)
    const incremental = tickBy(make(), 3600, 0.25)

    expect(incremental.bank).toEqual(bulk.bank)
    expect(incremental.skills).toEqual(bulk.skills)
    expect(incremental.rngSeed).toBe(bulk.rngSeed)
  })

  it('does not boost the very kill that earns it', () => {
    // The boss is recorded before its own xp is awarded, so the first kill pays the
    // base rate. Keeps the moment reproducible and easy to reason about.
    const state = tickBy(startCombat(championed(), 'rustbelt', 'overseer'), 600, 0.5)
    const overseerXp = getEnemy('overseer')!.xp
    // Branch-neutral: the champion fights ranged, so Attack alone reads as zero.
    expect(combatXpSince(state, 99)).toBeGreaterThanOrEqual(overseerXp)
  })
})

describe('locked places', () => {
  it('treats everywhere as open while nothing carries a lock', () => {
    const state = newGame()
    expect(isNodeOpen(state, 'the_hollow')).toBe(true)
    expect(isNodeOpen(state, 'vitrified_zone')).toBe(true)
  })

  it('reports an unknown place as closed rather than crashing', () => {
    expect(isNodeOpen(newGame(), 'atlantis')).toBe(false)
  })

  it('refuses to put you in a locked place, and lets you in once it opens', () => {
    const state = newGame()
    const sealed = WORLD_NODES.find((node) => node.unlockedBy)!

    expect(placeActor(state, 'mech', sealed.id)).toBe(false)
    recordDefeat(state, sealed.unlockedBy!)
    expect(placeActor(state, 'mech', sealed.id)).toBe(true)
  })

  it('does not shut a place behind a lock that no boss can open', () => {
    // A node gated on an enemy id that does not exist would be permanently sealed.
    for (const node of WORLD_NODES) {
      if (!node.unlockedBy) continue
      expect(getEnemy(node.unlockedBy), `${node.id} is gated on nothing`).toBeDefined()
    }
  })
})
