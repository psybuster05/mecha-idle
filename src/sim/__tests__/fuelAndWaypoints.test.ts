import { describe, it, expect } from 'vitest'
import { getItem } from '../../content'
import { WAYPOINTS, WAYPOINT_TRAVEL_SECONDS } from '../../content/skills/cartography'
import { getNode } from '../../content/world'
import { newGame, type GameState } from '../state'
import { burnFuel, startSkillAction } from '../intents'
import { tick } from '../tick'
import { derivedStats } from '../stats'
import { isWaypoint } from '../world'
import { xpForLevel } from '../xp'
import { deserialize, serialize } from '../save'

function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
}

function withFuel(item = 'catalyst_flask', seed = 5): GameState {
  const state = newGame(seed)
  state.bank[item] = 2
  return state
}

describe('burning fuel', () => {
  it('consumes the item and starts the boost', () => {
    const { state, error } = burnFuel(withFuel(), 'catalyst_flask')
    expect(error).toBeNull()
    expect(state.bank['catalyst_flask']).toBe(1)
    expect(state.boost?.multiplier).toBe(2)
    expect(state.boost?.secondsRemaining).toBe(getItem('catalyst_flask')!.fuel!.seconds)
  })

  it('refuses what it cannot burn', () => {
    expect(burnFuel(newGame(), 'scrap_steel').error).toBe('not-fuel')
    expect(burnFuel(newGame(), 'catalyst_flask').error).toBe('not-in-bank')
  })

  it('refuses to stack, so hoarding is never correct', () => {
    const first = burnFuel(withFuel(), 'catalyst_flask').state
    const second = burnFuel(first, 'catalyst_flask')
    expect(second.error).toBe('already-burning')
    expect(second.state.bank['catalyst_flask']).toBe(1)
  })

  it('makes work faster while it lasts, and stops when it ends', () => {
    const lit = burnFuel(withFuel(), 'catalyst_flask').state
    expect(derivedStats(lit).skillDurationScale).toBeCloseTo(0.5, 6)

    const spent = tickBy(lit, getItem('catalyst_flask')!.fuel!.seconds + 10, 1)
    expect(spent.boost).toBeNull()
    expect(derivedStats(spent).skillDurationScale).toBe(1)
  })

  it('compounds with equipment rather than replacing it', () => {
    const kitted = withFuel()
    kitted.bank['arms_precision'] = 1
    kitted.equipment.arms = 'arms_precision'
    const lit = burnFuel(kitted, 'catalyst_flask').state
    // 25% faster arms and a x2 flask: 1 / (1.25 * 2).
    expect(derivedStats(lit).skillDurationScale).toBeCloseTo(1 / 2.5, 6)
  })

  it('survives a save', () => {
    const lit = burnFuel(withFuel(), 'catalyst_flask').state
    const result = deserialize(serialize(lit, Date.now()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.boost?.multiplier).toBe(2)
  })

  it('discards a corrupt or expired boost on load', () => {
    const broken = { ...newGame(), boost: { multiplier: 99, secondsRemaining: -5, source: 'x' } }
    const result = deserialize(JSON.stringify(broken))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.boost).toBeNull()
  })
})

/**
 * The trap this design had to avoid.
 *
 * Action duration depends on whether fuel is burning, so a single large step spanning
 * the moment it runs out would apply one rate across the whole span while many small
 * steps applied both. `advance` splits at the expiry for exactly this reason.
 */
describe('a boost expiring mid-step', () => {
  it('produces the same result in one step as in many', () => {
    const make = () => {
      const state = burnFuel(withFuel('catalyst_flask', 4242), 'catalyst_flask').state
      state.actors.mech.at = 'roadside'
      return startSkillAction(state, 'scavenging', 'roadside_wrecks')
    }
    // 900s spans the 600s flask, so the split is exercised.
    const bulk = tick(make(), 900)
    const incremental = tickBy(make(), 900, 0.25)

    expect(incremental.bank).toEqual(bulk.bank)
    expect(incremental.skills).toEqual(bulk.skills)
    expect(incremental.boost).toEqual(bulk.boost)
  })

  it('really does produce more than an unboosted run', () => {
    // Guards against the split quietly cancelling the bonus it exists to protect.
    const base = () => {
      const s = newGame(4242)
      s.actors.mech.at = 'roadside'
      return startSkillAction(s, 'scavenging', 'roadside_wrecks')
    }
    const plain = tickBy(base(), 600, 1)

    const lit = burnFuel({ ...base(), bank: { catalyst_flask: 1 } }, 'catalyst_flask').state
    const boosted = tickBy(startSkillAction(lit, 'scavenging', 'roadside_wrecks'), 600, 1)

    expect(boosted.skills.scavenging).toBeGreaterThan(plain.skills.scavenging * 1.5)
  })
})

describe('waypoints', () => {
  it('open with Cartography level and not before', () => {
    const first = WAYPOINTS[0]!
    const state = newGame()
    expect(isWaypoint(state, first.node)).toBe(false)

    state.skills.cartography = xpForLevel(first.level)
    expect(isWaypoint(state, first.node)).toBe(true)
  })

  it('only name places that exist', () => {
    for (const waypoint of WAYPOINTS) {
      expect(getNode(waypoint.node), `unknown waypoint "${waypoint.node}"`).toBeDefined()
      expect(waypoint.level).toBeGreaterThan(0)
      expect(waypoint.level).toBeLessThanOrEqual(99)
    }
  })

  it('open in ascending order, so the ladder reads sensibly', () => {
    const levels = WAYPOINTS.map((w) => w.level)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it('turn a long walk into a fixed short hop', () => {
    // Reactor Slag Fields is a genuine trek from the camp on foot.
    const walker = newGame()
    walker.skills.scavenging = xpForLevel(30)
    const onFoot = startSkillAction(walker, 'scavenging', 'reactor_slag')
    const walkSeconds = onFoot.actors.mech.travel!.legSeconds

    const surveyed = newGame()
    surveyed.skills.cartography = xpForLevel(30)
    surveyed.skills.scavenging = xpForLevel(30)
    const hopped = startSkillAction(surveyed, 'scavenging', 'reactor_slag')

    expect(hopped.actors.mech.travel!.legSeconds).toBe(WAYPOINT_TRAVEL_SECONDS)
    expect(hopped.actors.mech.travel!.to).toBe('slag_fields')
    expect(WAYPOINT_TRAVEL_SECONDS).toBeLessThan(walkSeconds)
  })

  it('still arrive, and still record the visit', () => {
    const surveyed = newGame()
    surveyed.skills.cartography = xpForLevel(30)
    surveyed.skills.scavenging = xpForLevel(30) // reactor_slag is level-gated
    const arrived = tickBy(startSkillAction(surveyed, 'scavenging', 'reactor_slag'), 60, 0.5)

    expect(arrived.actors.mech.at).toBe('slag_fields')
    expect(arrived.visited).toContain('slag_fields')
    expect(arrived.bank['scrap_steel']).toBeGreaterThan(0)
  })
})
