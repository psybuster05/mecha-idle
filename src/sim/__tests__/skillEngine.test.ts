import { describe, it, expect } from 'vitest'
import { tick } from '../tick'
import { newGame, setActivity, type GameState } from '../state'
import { count } from '../bank'
import { xpForLevel } from '../xp'
import { getAction } from '../../content'
import { waitingFor } from '../skillEngine'

// Read the balance out of the content tables rather than hardcoding it, so a
// deliberate rebalance does not read as a broken engine.
const ROADSIDE = getAction('scavenging', 'roadside_wrecks')!
const SMELT = getAction('refining', 'smelt_steel')!

function scavenging(action = 'roadside_wrecks', seed = 42): GameState {
  const state = newGame(seed)
  setActivity(state, 'mech', { kind: 'skill', skill: 'scavenging', action })
  return state
}

/** Apply `total` seconds as repeated `step`-second ticks. */
function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
}

describe('skill engine - completion timing', () => {
  it('produces nothing before the action duration elapses', () => {
    const state = tick(scavenging(), ROADSIDE.duration - 0.1)
    expect(count(state, 'scrap_steel')).toBe(0)
    expect(state.skills.scavenging).toBe(0)
    expect(state.actors.mech.progress).toBeCloseTo(ROADSIDE.duration - 0.1, 6)
  })

  it('completes exactly once at the duration boundary', () => {
    const state = tick(scavenging(), ROADSIDE.duration)
    expect(count(state, 'scrap_steel')).toBe(1)
    expect(state.skills.scavenging).toBe(ROADSIDE.xp)
    expect(state.actors.mech.progress).toBeCloseTo(0, 6)
  })

  it('carries leftover progress into the next action', () => {
    const state = tick(scavenging(), ROADSIDE.duration + 1)
    expect(count(state, 'scrap_steel')).toBe(1)
    expect(state.actors.mech.progress).toBeCloseTo(1, 6)
  })

  it('applies many completions in a single large step', () => {
    const state = tick(scavenging(), ROADSIDE.duration * 10)
    expect(count(state, 'scrap_steel')).toBe(10)
    expect(state.skills.scavenging).toBe(ROADSIDE.xp * 10)
  })

  it('does nothing for zero, negative or non-finite dt', () => {
    const base = scavenging()
    for (const dt of [0, -5, NaN, Infinity]) {
      expect(tick(base, dt)).toEqual(base)
    }
  })
})

describe('skill engine - purity', () => {
  it('does not mutate the state passed in', () => {
    const before = scavenging()
    const snapshot = structuredClone(before)
    tick(before, 100)
    expect(before).toEqual(snapshot)
  })
})

/**
 * The property offline progress rests on.
 *
 * Crediting eight hours away must land in exactly the same place as having played
 * those eight hours. If this ever fails, offline progress is silently wrong.
 */
describe('skill engine - bulk and incremental are equivalent', () => {
  it('matches for a plain gathering action', () => {
    // 0.25s steps divide 60 exactly, so the comparison is not measuring float drift.
    const bulk = tick(scavenging(), 60)
    const incremental = tickBy(scavenging(), 60, 0.25)
    expect(incremental).toEqual(bulk)
  })

  it('matches for an action with random drops', () => {
    // drone_graveyard rolls an 8% servo drop on every completion, so this also
    // pins down that the RNG is consumed in the same order either way.
    const make = () => {
      const state = scavenging('drone_graveyard', 12345)
      state.skills.scavenging = xpForLevel(25)
      return state
    }
    const bulk = tick(make(), 600)
    const incremental = tickBy(make(), 600, 0.25)

    expect(incremental).toEqual(bulk)
    expect(bulk.rngSeed).not.toBe(12345) // the rolls actually happened
    expect(count(bulk, 'intact_servo')).toBeGreaterThan(0)
  })
})

describe('skill engine - halting', () => {
  it('refuses an action above the current level', () => {
    const state = tick(scavenging('drone_graveyard'), 10)
    expect(state.actors.mech.activity).toBeNull()
    expect(state.actors.mech.stoppedReason).toBe('level-too-low')
    expect(count(state, 'scrap_steel')).toBe(0)
  })

  it('waits when materials run out, keeping the order standing', () => {
    const state = newGame()
    state.bank['scrap_steel'] = 3 // smelting costs 2, so exactly one is affordable
    setActivity(state, 'mech', { kind: 'skill', skill: 'refining', action: 'smelt_steel' })

    const after = tick(state, SMELT.duration * 3) // room for three completions

    expect(count(after, 'steel_ingot')).toBe(1)
    expect(count(after, 'scrap_steel')).toBe(1)
    expect(after.skills.refining).toBe(SMELT.xp)

    // Still on the job. Halting would mean the other actor could restock it and nothing
    // would happen; waiting means it picks up the moment stock exists.
    expect(after.actors.mech.activity).not.toBeNull()
    expect(after.actors.mech.stoppedReason).toBeNull()
    expect(waitingFor(after, 'mech').map((s) => s.item)).toEqual(['scrap_steel'])
  })

  it('banks no progress it could not have used', () => {
    // Without a cap, a long wait would store hours of progress against an empty bank
    // and spend it all the instant one input appeared.
    const state = newGame()
    setActivity(state, 'mech', { kind: 'skill', skill: 'refining', action: 'smelt_steel' })

    let after = tick(state, 3600) // an hour with nothing to smelt
    expect(after.actors.mech.progress).toBe(0)

    after.bank['scrap_steel'] = 2
    after = tick(after, SMELT.duration)
    expect(count(after, 'steel_ingot')).toBe(1)
  })

  it('picks straight back up when stock arrives', () => {
    const state = newGame()
    state.bank['scrap_steel'] = 2
    setActivity(state, 'mech', { kind: 'skill', skill: 'refining', action: 'smelt_steel' })

    let after = tick(state, SMELT.duration * 5)
    expect(count(after, 'steel_ingot')).toBe(1)

    after.bank['scrap_steel'] = 10
    after = tick(after, SMELT.duration * 5)
    expect(count(after, 'steel_ingot')).toBe(6)
  })

  it('halts on an action id that is not in the content tables', () => {
    const state = scavenging('does_not_exist')
    const after = tick(state, 10)
    expect(after.actors.mech.stoppedReason).toBe('unknown-action')
  })
})

describe('skill engine - actors', () => {
  it('does not advance a locked actor', () => {
    const state = newGame()
    // Force an activity onto the crawler, bypassing the unlock check.
    state.actors.crawler.activity = { kind: 'skill', skill: 'scavenging', action: 'roadside_wrecks' }
    const after = tick(state, 60)
    expect(count(after, 'scrap_steel')).toBe(0)
  })

  it('resets progress and stop reason when switching action', () => {
    let state = tick(scavenging(), 2)
    expect(state.actors.mech.progress).toBeGreaterThan(0)

    setActivity(state, 'mech', { kind: 'skill', skill: 'refining', action: 'smelt_steel' })
    expect(state.actors.mech.progress).toBe(0)
    expect(state.actors.mech.stoppedReason).toBeNull()

    state = tick(state, 1)
    expect(count(state, 'scrap_steel')).toBe(0)
  })

  it('advances the elapsed clock regardless of activity', () => {
    const state = tick(newGame(), 42)
    expect(state.elapsed).toBe(42)
  })
})
