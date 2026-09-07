import { describe, it, expect } from 'vitest'
import { applyOffline, MAX_OFFLINE_SECONDS, MIN_OFFLINE_SECONDS } from '../offline'
import { newGame, setActivity, type GameState } from '../state'
import { tick } from '../tick'
import { count } from '../bank'
import { xpForLevel } from '../xp'
import { getAction } from '../../content'

const ROADSIDE = getAction('scavenging', 'roadside_wrecks')!

const NOW = 1_700_000_000_000

function away(seconds: number, build: (s: GameState) => void = () => {}): GameState {
  const state = newGame(31337)
  build(state)
  state.savedAt = NOW - seconds * 1000
  return state
}

function scavengingFor(seconds: number): GameState {
  return away(seconds, (s) =>
    setActivity(s, 'mech', { kind: 'skill', skill: 'scavenging', action: 'roadside_wrecks' }),
  )
}

function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
}

describe('offline - when nothing should happen', () => {
  it('says nothing for a brand new game', () => {
    const { report } = applyOffline(newGame(), NOW)
    expect(report).toBeNull()
  })

  it('says nothing for a page refresh', () => {
    const { state, report } = applyOffline(scavengingFor(MIN_OFFLINE_SECONDS - 1), NOW)
    expect(report).toBeNull()
    expect(count(state, 'scrap_steel')).toBe(0)
  })

  it('ignores a clock that has moved backwards', () => {
    // Timezone change or a manual clock adjustment. Must never rewind or credit.
    const state = scavengingFor(-3600)
    const result = applyOffline(state, NOW)
    expect(result.report).toBeNull()
    expect(result.state).toBe(state)
  })
})

/**
 * The headline guarantee.
 *
 * Coming back after eight hours must land in exactly the same place as having
 * played those eight hours. Everything else in the sim - pure tick, event-stepped
 * combat, bulk skill completions - exists to make this line true.
 */
describe('offline - matches having actually played', () => {
  it('matches for eight hours of scavenging', () => {
    const { state: offline } = applyOffline(scavengingFor(8 * 3600), NOW)
    const online = tickBy(scavengingFor(8 * 3600), 8 * 3600, 0.5)
    expect(offline).toEqual(online)
  })

  it('matches for eight hours of combat', () => {
    const build = (s: GameState) => {
      for (const skill of ['attack', 'strength', 'defence', 'hitpoints', 'ranged'] as const) {
        s.skills[skill] = xpForLevel(40)
      }
      setActivity(s, 'mech', { kind: 'combat', zone: 'rustbelt' })
    }
    const { state: offline } = applyOffline(away(8 * 3600, build), NOW)
    const online = tickBy(away(8 * 3600, build), 8 * 3600, 0.5)

    // Everything the player can see is exact. The sub-second swing timers drift by
    // about 1e-15 over eight hours, because accumulating thousands of small steps and
    // subtracting one large one are not bit-identical in floating point. Asserting
    // deep equality here would be asserting something floats cannot provide.
    expect(offline.bank).toEqual(online.bank)
    expect(offline.skills).toEqual(online.skills)
    expect(offline.rngSeed).toBe(online.rngSeed)
    expect(offline.combat.enemyId).toBe(online.combat.enemyId)
    expect(offline.combat.hp).toBeCloseTo(online.combat.hp, 6)
    expect(offline.combat.enemyHp).toBeCloseTo(online.combat.enemyHp, 6)
    expect(offline.combat.attackProgress).toBeCloseTo(online.combat.attackProgress, 9)
  })
})

describe('offline - the report', () => {
  it('credits xp and items, and totals them correctly', () => {
    const { state, report } = applyOffline(scavengingFor(3600), NOW)
    expect(report).not.toBeNull()
    if (!report) return

    expect(report.seconds).toBe(3600)
    expect(report.awaySeconds).toBeNull()
    const completions = 3600 / ROADSIDE.duration
    expect(report.items['scrap_steel']).toBe(completions)
    expect(report.skillXp.scavenging).toBe(completions * ROADSIDE.xp)
    expect(count(state, 'scrap_steel')).toBe(completions)
    expect(report.stopped).toBeNull()
  })

  it('omits skills that gained nothing', () => {
    const { report } = applyOffline(scavengingFor(3600), NOW)
    expect(report?.skillXp.refining).toBeUndefined()
    expect(Object.keys(report?.skillXp ?? {})).toEqual(['scavenging'])
  })

  it('shows consumed inputs as negatives', () => {
    const state = away(600, (s) => {
      s.bank['scrap_steel'] = 100
      setActivity(s, 'mech', { kind: 'skill', skill: 'refining', action: 'smelt_steel' })
    })
    const { report } = applyOffline(state, NOW)
    expect(report?.items['scrap_steel']).toBeLessThan(0)
    expect(report?.items['steel_ingot']).toBeGreaterThan(0)
  })

  it('says what you ran out of, since waiting looks like working', () => {
    const state = away(8 * 3600, (s) => {
      s.bank['scrap_steel'] = 10 // only five smelts' worth
      setActivity(s, 'mech', { kind: 'skill', skill: 'refining', action: 'smelt_steel' })
    })
    const { report } = applyOffline(state, NOW)

    // Not stopped - still on the job, just out of stock. The order stands.
    expect(report?.stopped).toBeNull()
    expect(report?.waiting).toEqual({ actor: 'mech', missing: ['scrap_steel'] })
    expect(report?.items['steel_ingot']).toBe(5)
  })
})

describe('offline - the cap', () => {
  it('credits at most the cap, and says how long you were really gone', () => {
    const realAway = 48 * 3600
    const { report } = applyOffline(scavengingFor(realAway), NOW)
    expect(report?.seconds).toBe(MAX_OFFLINE_SECONDS)
    expect(report?.awaySeconds).toBeCloseTo(realAway, 0)
  })

  it('does not flag a capped absence when the stay was within the limit', () => {
    const { report } = applyOffline(scavengingFor(MAX_OFFLINE_SECONDS - 10), NOW)
    expect(report?.awaySeconds).toBeNull()
  })

  it('credits exactly the capped amount of work', () => {
    const { report } = applyOffline(scavengingFor(100 * 3600), NOW)
    expect(report?.items['scrap_steel']).toBe(MAX_OFFLINE_SECONDS / ROADSIDE.duration)
  })
})
