import { describe, it, expect } from 'vitest'
import { activePhase, getEnemy } from '../../content/enemies'
import { getNode, WORLD_NODES } from '../../content/world'
import { getStoryBeat } from '../../content/story'
import { newGame, recordDefeat, type GameState } from '../state'
import { equipItem } from '../equipment'
import { derivedStats, PHASE_TRANSITION_HEAL } from '../stats'
import { startCombat } from '../intents'
import { tick } from '../tick'
import { advanceStory } from '../story'
import { isNodeOpen } from '../world'
import { xpForLevel } from '../xp'

const EARLIER_BOSSES = ['overseer', 'quartermaster', 'tower_actual', 'registrar', 'census']

function kitted(weapon: string, level: number, extraBosses: string[] = []): GameState {
  const state = newGame(99)
  for (const skill of ['attack', 'strength', 'defence', 'hitpoints', 'ranged'] as const) {
    state.skills[skill] = xpForLevel(level)
  }
  for (const boss of [...EARLIER_BOSSES, ...extraBosses]) recordDefeat(state, boss)
  state.actors.mech.at = extraBosses.includes('adjutant') ? 'switch_room' : 'command_annex'
  for (const part of [weapon, 'frame_command', 'legs_thruster', 'arms_labour', 'reactor_grid']) {
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

describe('the chain closes', () => {
  it('opens the base on the Census and the lair on the Adjutant', () => {
    const state = newGame()
    for (const boss of EARLIER_BOSSES.slice(0, 4)) recordDefeat(state, boss)
    expect(isNodeOpen(state, 'supply_yards')).toBe(false)

    recordDefeat(state, 'census')
    expect(isNodeOpen(state, 'supply_yards')).toBe(true)
    // The base does not open the lair.
    expect(isNodeOpen(state, 'switch_room')).toBe(false)

    recordDefeat(state, 'adjutant')
    expect(isNodeOpen(state, 'switch_room')).toBe(true)
  })

  it('strands nobody: every gate names a boss that exists', () => {
    for (const id of ['supply_yards', 'parade_ground', 'command_annex']) {
      expect(getNode(id)?.unlockedBy, id).toBe('census')
    }
    for (const id of ['the_gallery', 'switch_room']) {
      expect(getNode(id)?.unlockedBy, id).toBe('adjutant')
    }
  })
})

/**
 * Bosses heal you on each phase change.
 *
 * Without it a long fight is unwinnable by arithmetic rather than difficulty:
 * regeneration is 0.4%/s against a max HP near 1,100, so a 400-second boss could only
 * ever deal about 2.6 net damage per second. Healing at each threshold turns one long
 * fight into several short ones, which is the shape the HP budget supports.
 */
describe('phase transitions buy a breather', () => {
  it('restores a share of max HP when a threshold is crossed', () => {
    let state = startCombat(kitted('weapon_sentence', 99, ['adjutant']), 'the_lair', 'colonel')
    const max = derivedStats(state).maxHp

    let sawRecovery = false
    let previous = max
    for (let i = 0; i < 1400; i++) {
      state = tick(state, 0.5)
      if (state.combat.hp > previous + max * PHASE_TRANSITION_HEAL * 0.5) sawRecovery = true
      previous = state.combat.hp
      if ((state.defeated['colonel'] ?? 0) > 0) break
    }
    expect(sawRecovery).toBe(true)
  })

  it('never overheals', () => {
    let state = startCombat(kitted('weapon_sentence', 99, ['adjutant']), 'the_lair', 'colonel')
    for (let i = 0; i < 800; i++) {
      state = tick(state, 0.5)
      expect(state.combat.hp).toBeLessThanOrEqual(derivedStats(state).maxHp + 1e-6)
    }
  })
})

describe('The Colonel', () => {
  const colonel = getEnemy('colonel')!

  it('runs every lesson the game has taught, in order', () => {
    // Armour, then evasion, then a damage floor - the checkpoint, the tower, the census.
    const phases = colonel.phases!
    expect(phases[0]!.armourMultiplier!).toBeGreaterThan(1)
    expect(phases[1]!.evasionMultiplier!).toBeGreaterThan(1)
    expect(phases[2]!.regenPerSecond!).toBeGreaterThan(0)
  })

  it('sets its damage floor below reachable output', () => {
    // The Census shipped at 120 HP/s against 30 achievable DPS once. Never again.
    const recount = colonel.phases![2]!
    expect(colonel.maxHp * recount.regenPerSecond!).toBeLessThan(10)
  })

  it('falls at level 99 to a properly equipped mech', () => {
    const won = tickBy(
      startCombat(kitted('weapon_sentence', 99, ['adjutant']), 'the_lair', 'colonel'),
      900,
      0.5,
    )
    expect(won.defeated['colonel'] ?? 0).toBeGreaterThan(0)
  })

  it('destroys one that turned up without a weapon', () => {
    const state = newGame(99)
    for (const skill of ['attack', 'strength', 'defence', 'hitpoints', 'ranged'] as const) {
      state.skills[skill] = xpForLevel(95)
    }
    for (const boss of [...EARLIER_BOSSES, 'adjutant']) recordDefeat(state, boss)
    state.actors.mech.at = 'switch_room'

    const lost = tickBy(startCombat(state, 'the_lair', 'colonel'), 1800, 0.5)
    expect(lost.defeated['colonel'] ?? 0).toBe(0)
    expect(lost.actors.mech.stoppedReason).toBe('destroyed')
  })

  it('gates nothing behind himself', () => {
    // He is the end. Anything locked behind him would be content nobody reaches.
    const behindHim = WORLD_NODES.filter((node) => node.unlockedBy === 'colonel')
    expect(behindHim.map((n) => n.id)).toEqual([])
  })
})

describe('the ending', () => {
  it('fires only when every boss has fallen', () => {
    const state = newGame()
    for (const boss of [...EARLIER_BOSSES, 'adjutant']) recordDefeat(state, boss)
    advanceStory(state)
    expect(state.story.pending).not.toContain('the_end')

    recordDefeat(state, 'colonel')
    advanceStory(state)
    expect(state.story.pending).toContain('the_end')
  })

  it('is an interrupt, because it is the point of the whole thing', () => {
    expect(getStoryBeat('the_end')?.kind).toBe('interrupt')
    expect(getStoryBeat('colonel_defeated')?.kind).toBe('interrupt')
  })

  it('leaves the game playable afterwards', () => {
    // You can keep going. Nothing shuts down when the story ends.
    let state = kitted('weapon_sentence', 99, ['adjutant'])
    recordDefeat(state, 'colonel')
    state = tickBy(startCombat(state, 'the_lair', 'household_guard'), 600, 0.5)
    expect(state.skills.attack).toBeGreaterThan(xpForLevel(99))
  })
})

describe('the last guards', () => {
  it('are beatable but slow', () => {
    const state = tickBy(
      startCombat(kitted('weapon_sentence', 99, ['adjutant']), 'the_lair', 'household_guard'),
      1800,
      0.5,
    )
    const kills = (state.skills.attack - xpForLevel(99)) / getEnemy('household_guard')!.xp
    expect(kills).toBeGreaterThan(0)
    expect(kills).toBeLessThan(30)
  })

  it('come one at a time, with room to breathe', () => {
    expect(activePhase(getEnemy('household_guard')!, 100)).toBeNull()
  })
})
