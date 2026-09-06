import { describe, it, expect } from 'vitest'
import {
  ALL_SKILLS,
  newGame,
  cloneState,
  canStartActivity,
  maxConcurrentActivities,
  busyActors,
  SAVE_VERSION,
} from '../state'

describe('newGame', () => {
  it('starts every skill at zero xp', () => {
    const state = newGame()
    for (const skill of ALL_SKILLS) expect(state.skills[skill]).toBe(0)
  })

  it('starts with the mech unlocked and the crawler not', () => {
    const state = newGame()
    expect(state.actors.mech.unlocked).toBe(true)
    expect(state.actors.crawler.unlocked).toBe(false)
    expect(busyActors(state)).toEqual([])
  })

  it('stamps the current save version', () => {
    expect(newGame().version).toBe(SAVE_VERSION)
  })
})

describe('cloneState', () => {
  it('produces an independent copy', () => {
    const state = newGame()
    const copy = cloneState(state)
    copy.skills.scavenging = 500
    copy.bank['scrap'] = 10
    expect(state.skills.scavenging).toBe(0)
    expect(state.bank['scrap']).toBeUndefined()
  })
})

describe('concurrency rule', () => {
  it('allows exactly one activity before the crawler is salvaged', () => {
    const state = newGame()
    expect(maxConcurrentActivities(state)).toBe(1)

    expect(canStartActivity(state, 'mech')).toBe(true)
    // The crawler is locked, so it cannot act regardless of the limit.
    expect(canStartActivity(state, 'crawler')).toBe(false)

    state.actors.mech.activity = { kind: 'skill', skill: 'scavenging', action: 'x' }
    expect(busyActors(state)).toEqual(['mech'])
    // The mech may always switch to a different action.
    expect(canStartActivity(state, 'mech')).toBe(true)
  })

  it('allows two once the crawler is unlocked', () => {
    const state = newGame()
    state.actors.crawler.unlocked = true
    expect(maxConcurrentActivities(state)).toBe(2)

    state.actors.mech.activity = { kind: 'combat', zone: 'z' }
    expect(canStartActivity(state, 'crawler')).toBe(true)
  })
})
