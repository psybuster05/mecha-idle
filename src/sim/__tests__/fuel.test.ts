import { describe, it, expect } from 'vitest'
import { getItem } from '../../content'
import { getAction, YIELD_PER_LEVEL } from '../../content'
import { ENEMIES, perkTotal } from '../../content/enemies'
import { newGame, type GameState } from '../state'
import { burnFuel, startSkillAction } from '../intents'
import { tick } from '../tick'
import { derivedStats } from '../stats'
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
    const broken = {
      ...newGame(),
      boost: { multiplier: 99, secondsRemaining: -5, source: 'x' },
    }
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

/**
 * Bonus haul.
 *
 * This was Cartography's job, and Cartography is gone: as a separate skill you had to
 * stop gathering in order to train the thing that made gathering better, which measured
 * out as a 504-hour investment needing 1,715 hours of gathering to repay. Each skill now
 * raises its own yield instead, so the reward lands on whatever you are already doing.
 */
describe('bonus haul', () => {
  const roadside = () => {
    const s = newGame(99)
    s.actors.mech.at = 'roadside'
    return s
  }

  it('pays nothing at level 1 and a great deal at 99', () => {
    const green = tickBy(startSkillAction(roadside(), 'scavenging', 'roadside_wrecks'), 3600, 1)

    const veteran = roadside()
    veteran.skills.scavenging = xpForLevel(99)
    const skilled = tickBy(startSkillAction(veteran, 'scavenging', 'roadside_wrecks'), 3600, 1)

    // Same number of completions either way - this is a bonus haul, not faster work.
    const wrecks = getAction('scavenging', 'roadside_wrecks')!
    expect(skilled.skills.scavenging - xpForLevel(99)).toBe(green.skills.scavenging)
    expect(skilled.bank['scrap_steel']!).toBeGreaterThan(green.bank['scrap_steel']!)
    expect(wrecks).toBeDefined()
  })

  it('pays about what the number says', () => {
    const veteran = roadside()
    veteran.skills.scavenging = xpForLevel(99)
    const hours = 40
    const after = tickBy(
      startSkillAction(veteran, 'scavenging', 'roadside_wrecks'),
      hours * 3600,
      1,
    )

    const wrecks = getAction('scavenging', 'roadside_wrecks')!
    const completions = (hours * 3600) / wrecks.duration
    const perCompletion = wrecks.outputs.find((o) => o.item === 'scrap_steel')!.qty
    const expected = completions * perCompletion * (1 + 98 * YIELD_PER_LEVEL)
    expect(after.bank['scrap_steel']!).toBeGreaterThan(expected * 0.95)
    expect(after.bank['scrap_steel']!).toBeLessThan(expected * 1.05)
  })

  it('only boosts the skill being trained, never the others', () => {
    // The whole reason this stopped being its own skill: a bonus that pays out across
    // everything makes training the booster compete with what it boosts.
    const veteran = roadside()
    veteran.skills.scavenging = xpForLevel(99)
    veteran.bank['scrap_steel'] = 100000

    const smeltMaxedScavenging = tickBy(
      startSkillAction(veteran, 'refining', 'smelt_steel'),
      3600,
      1,
    )
    const plain = roadside()
    plain.bank['scrap_steel'] = 100000
    const smeltPlain = tickBy(startSkillAction(plain, 'refining', 'smelt_steel'), 3600, 1)

    expect(smeltMaxedScavenging.bank['steel_ingot']).toBe(smeltPlain.bank['steel_ingot'])
  })

  it('is a serious reward that still loses to clearing the world', () => {
    // If maxing one skill beat every boss in the game on the same axis, the fastest route
    // through an idle game would be to ignore all of it except this. Either side retuning
    // trips this.
    const maxed = 98 * YIELD_PER_LEVEL
    const allBosses = perkTotal(
      Object.fromEntries(ENEMIES.filter((e) => e.isBoss).map((e) => [e.id, 1])),
      'gatheringYield',
    )
    expect(maxed).toBeGreaterThan(allBosses * 0.4)
    expect(maxed).toBeLessThan(allBosses)
  })

  /**
   * The trap this mechanic has always had to avoid.
   *
   * A skill raises its own yield as it levels, so a single large offline step would roll
   * the whole span at the level it started at while many small steps would not - and
   * unlike ordinary rounding slop, that gap would grow with time away. The engine
   * recomputes the chance per completion for exactly this reason.
   */
  it('levels itself mid-step without breaking the offline guarantee', () => {
    const make = () => startSkillAction(newGame(4242), 'scavenging', 'roadside_wrecks')
    const bulk = tick(make(), 4 * 3600)
    const incremental = tickBy(make(), 4 * 3600, 0.5)

    expect(bulk.skills).toEqual(incremental.skills)
    expect(bulk.bank).toEqual(incremental.bank)
    expect(bulk.rngSeed).toBe(incremental.rngSeed)
  })
})
