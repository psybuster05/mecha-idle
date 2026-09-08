import { describe, it, expect } from 'vitest'
import { getAction, YIELD_PER_LEVEL } from '../../content'
import { ENEMIES, perkTotal } from '../../content/enemies'
import { newGame, type GameState } from '../state'
import { count } from '../bank'
import { installCrawler, setSpeed, startSkillAction } from '../intents'
import { availableEnergy, effectiveSpeed, fuelEnergy, secondsOfFuel } from '../fuel'
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

/** Fuel only burns for work, so anything measuring a burn rate needs a job running. */
function working(state: GameState): GameState {
  state.actors.mech.at = 'roadside'
  return startSkillAction(state, 'scavenging', 'roadside_wrecks')
}

describe('fuel as energy', () => {
  it('is worth what it was worth before the toggle existed', () => {
    // The reinterpretation was chosen to leave both items exactly as valuable: a flask
    // ran 600s at 2x and still does, a cell ran 420s at 3x and still does.
    expect(fuelEnergy('catalyst_flask')).toBe(600)
    expect(fuelEnergy('overcharge_cell')).toBe(840)

    const flask = withFuel('catalyst_flask')
    flask.bank['catalyst_flask'] = 1
    expect(secondsOfFuel(working(setSpeed(flask, 2)))).toBe(600)

    const cell = newGame()
    cell.bank['overcharge_cell'] = 1
    expect(secondsOfFuel(working(setSpeed(cell, 3)))).toBe(420)
  })

  it('counts nothing that is not fuel', () => {
    expect(fuelEnergy('scrap_steel')).toBe(0)
    const state = newGame()
    state.bank['scrap_steel'] = 1000
    expect(availableEnergy(state)).toBe(0)
  })

  it('burns faster the higher the setting', () => {
    const at = (speed: 1 | 2 | 3) => secondsOfFuel(working(setSpeed(withFuel(), speed)))
    expect(at(1)).toBe(Infinity)
    expect(at(2)).toBe(1200) // two flasks
    expect(at(3)).toBe(600)
  })
})

describe('the speed toggle', () => {
  it('runs at 1x with an empty tank, whatever it is set to', () => {
    const dry = setSpeed(newGame(), 3)
    expect(dry.speed).toBe(3)
    expect(effectiveSpeed(dry)).toBe(1)
    expect(derivedStats(dry).skillDurationScale).toBe(1)
  })

  it('drops itself back to 1x when the tank runs dry', () => {
    // This reversed a previous decision. The toggle used to hold its setting so a later
    // fuel drop resumed it, but that cannot coexist with disabling 2x and 3x on empty:
    // a button both selected and disabled is a contradiction. Dropping it is the honest
    // version, and the UI toasts so it is a decision rather than a surprise.
    let state = setSpeed(withFuel(), 3)
    state.actors.mech.at = 'roadside'
    state = startSkillAction(state, 'scavenging', 'roadside_wrecks')
    state = tickBy(state, 1200, 1) // burns both flasks dry

    expect(availableEnergy(state)).toBe(0)
    expect(state.speed).toBe(1)
    expect(effectiveSpeed(state)).toBe(1)
  })

  it('burns nothing while nothing is running', () => {
    // Fuel buys work. Leaving the tab open on the equipment screen at 3x should not
    // quietly empty a tank you were saving.
    let state = setSpeed(withFuel(), 3)
    const before = availableEnergy(state)
    state = tickBy(state, 600, 1)

    expect(state.actors.mech.activity).toBeNull()
    expect(availableEnergy(state)).toBe(before)
    expect(state.speed).toBe(3)
  })

  it('burns for the crawler working alone, because that is still work', () => {
    let state = setSpeed(withFuel(), 2)
    state.bank['crawler_core'] = 1
    state = installCrawler(state).state
    state.bank['scrap_steel'] = 10000
    state = startSkillAction(state, 'refining', 'smelt_steel', 'crawler')
    const before = availableEnergy(state)
    state = tickBy(state, 120, 1)

    expect(state.actors.mech.activity).toBeNull()
    expect(availableEnergy(state)).toBeLessThan(before)
  })

  it('does not touch the toggle while there is still fuel', () => {
    let state = setSpeed(withFuel(), 3)
    state.actors.mech.at = 'roadside'
    state = startSkillAction(state, 'scavenging', 'roadside_wrecks')
    state = tickBy(state, 60, 1)

    expect(availableEnergy(state)).toBeGreaterThan(0)
    expect(state.speed).toBe(3)
  })

  it('makes work faster in proportion to the setting', () => {
    const run = (speed: 1 | 2 | 3) => {
      let s = withFuel('catalyst_flask', 4242)
      s.bank['catalyst_flask'] = 50 // plenty, so the whole run is at speed
      s.actors.mech.at = 'roadside'
      s = setSpeed(s, speed)
      return tickBy(startSkillAction(s, 'scavenging', 'roadside_wrecks'), 300, 1).skills.scavenging
    }
    expect(run(2) / run(1)).toBeCloseTo(2, 1)
    expect(run(3) / run(1)).toBeCloseTo(3, 1)
  })

  it('compounds with equipment rather than replacing it', () => {
    const kitted = withFuel()
    kitted.bank['arms_precision'] = 1
    kitted.equipment.arms = 'arms_precision'
    // 25% faster arms and the toggle at 2x: 1 / (1.25 * 2).
    expect(derivedStats(setSpeed(kitted, 2)).skillDurationScale).toBeCloseTo(1 / 2.5, 6)
  })

  it('spends whole items from the bank as the tank empties', () => {
    let state = setSpeed(withFuel(), 2)
    state.actors.mech.at = 'roadside'
    state = startSkillAction(state, 'scavenging', 'roadside_wrecks')

    state = tickBy(state, 300, 1)
    // Half a flask in, one is still untouched in the bank.
    expect(state.bank['catalyst_flask']).toBe(1)
    expect(state.fuelEnergy).toBeCloseTo(300, 6)

    state = tickBy(state, 400, 1)
    // The bank drops a key at zero rather than storing one, so count() is the honest read.
    expect(count(state, 'catalyst_flask')).toBe(0)
  })

  it('burns the cheaper fuel first', () => {
    let state = newGame()
    state.bank['catalyst_flask'] = 1
    state.bank['overcharge_cell'] = 1
    state.actors.mech.at = 'roadside'
    state = setSpeed(state, 2)
    state = startSkillAction(state, 'scavenging', 'roadside_wrecks')

    state = tickBy(state, 60, 1)
    expect(count(state, 'catalyst_flask')).toBe(0)
    expect(count(state, 'overcharge_cell')).toBe(1)
  })

  it('survives a save', () => {
    const set = setSpeed(withFuel(), 3)
    const result = deserialize(serialize(set, Date.now()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.speed).toBe(3)
  })

  it('refuses a nonsense speed on load rather than running forever fast', () => {
    const broken = { ...newGame(), speed: 99, fuelEnergy: -5 }
    const result = deserialize(JSON.stringify(broken))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.speed).toBe(1)
    expect(result.state.fuelEnergy).toBe(0)
  })

  it('converts a boost that was still running when the save was written', () => {
    // 6 -> 7. Someone who closed the tab mid-burn comes back at the same speed with the
    // same amount left.
    const old = {
      ...newGame(),
      version: 6,
      boost: { multiplier: 3, secondsRemaining: 100, source: 'overcharge_cell' },
    } as Record<string, unknown>

    const result = deserialize(JSON.stringify(old))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.speed).toBe(3)
    expect(result.state.fuelEnergy).toBe(200) // 100s at 3x costs 2/s
    expect('boost' in result.state).toBe(false)
  })
})

/**
 * The trap this design has always had to avoid.
 *
 * Action duration depends on whether fuel is burning, so a single large step spanning
 * the moment the tank runs dry would apply one rate across the whole span while many
 * small steps applied both. `advance` splits at that moment for exactly this reason.
 */
describe('running out mid-step', () => {
  it('produces the same result in one step as in many', () => {
    const make = () => {
      const state = setSpeed(withFuel('catalyst_flask', 4242), 2)
      state.actors.mech.at = 'roadside'
      return startSkillAction(state, 'scavenging', 'roadside_wrecks')
    }
    // 1500s spans the 1200s the two flasks last, so the split is exercised.
    const bulk = tick(make(), 1500)
    const incremental = tickBy(make(), 1500, 0.25)

    expect(incremental.bank).toEqual(bulk.bank)
    expect(incremental.skills).toEqual(bulk.skills)
    expect(incremental.fuelEnergy).toBeCloseTo(bulk.fuelEnergy, 6)
  })

  it('really does produce more than an unfuelled run', () => {
    // Guards against the split quietly cancelling the bonus it exists to protect.
    const base = () => {
      const s = newGame(4242)
      s.actors.mech.at = 'roadside'
      return s
    }
    const plain = tickBy(startSkillAction(base(), 'scavenging', 'roadside_wrecks'), 600, 1)

    let lit = base()
    lit.bank['catalyst_flask'] = 1
    lit = setSpeed(lit, 2)
    const fuelled = tickBy(startSkillAction(lit, 'scavenging', 'roadside_wrecks'), 600, 1)

    expect(fuelled.skills.scavenging).toBeGreaterThan(plain.skills.scavenging * 1.5)
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
