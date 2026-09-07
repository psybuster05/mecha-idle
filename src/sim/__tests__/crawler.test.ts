import { describe, it, expect } from 'vitest'
import { getAction } from '../../content'
import {
  CRAWLER_SKILLS,
  canCrawlerRun,
  maxConcurrentActivities,
  newGame,
  type GameState,
} from '../state'
import { installCrawler, moveCrawler, startSkillAction, stopActivity } from '../intents'
import { tick } from '../tick'
import { CRAWLER_MOVE_SPEED } from '../stats'
import { moveSpeedOf } from '../world'
import { deserialize, serialize } from '../save'
import { xpForLevel } from '../xp'

function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
}

/** Awake, stocked, and skilled enough to run industry. */
function running(seed = 5): GameState {
  const state = newGame(seed)
  state.bank['crawler_core'] = 1
  const { state: awake, error } = installCrawler(state)
  expect(error).toBeNull()
  awake.skills.refining = xpForLevel(20)
  awake.skills.fabrication = xpForLevel(20)
  awake.bank['scrap_steel'] = 5000
  return awake
}

describe('waking the crawler', () => {
  it('starts asleep', () => {
    const state = newGame()
    expect(state.actors.crawler.unlocked).toBe(false)
    expect(maxConcurrentActivities(state)).toBe(1)
  })

  it('needs a traction core, and consumes it', () => {
    expect(installCrawler(newGame()).error).toBe('no-core')

    const state = newGame()
    state.bank['crawler_core'] = 1
    const { state: awake, error } = installCrawler(state)
    expect(error).toBeNull()
    expect(awake.actors.crawler.unlocked).toBe(true)
    expect(awake.bank['crawler_core']).toBeUndefined()
  })

  it('cannot be woken twice', () => {
    expect(installCrawler(running()).error).toBe('already-running')
  })

  it('wakes where you are, not where the defaults left it', () => {
    const state = newGame()
    state.actors.mech.at = 'slag_fields'
    state.bank['crawler_core'] = 1
    expect(installCrawler(state).state.actors.crawler.at).toBe('slag_fields')
  })

  it('is the moment one action becomes two', () => {
    expect(maxConcurrentActivities(running())).toBe(2)
  })

  it('survives a save', () => {
    const result = deserialize(serialize(running(), Date.now()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.actors.crawler.unlocked).toBe(true)
  })
})

/**
 * The whole point: both of you working at once.
 */
describe('two actors', () => {
  it('lets the crawler work while the mech is out', () => {
    let state = running()
    state = startSkillAction(state, 'scavenging', 'roadside_wrecks')
    state = startSkillAction(state, 'refining', 'smelt_steel', 'crawler')

    expect(state.actors.mech.activity).not.toBeNull()
    expect(state.actors.crawler.activity).not.toBeNull()

    state = tickBy(state, 300, 0.5)
    // Scrap from you, ingots from it, in the same span.
    expect(state.skills.scavenging).toBeGreaterThan(0)
    expect(state.bank['steel_ingot']).toBeGreaterThan(0)
  })

  it('still refuses a third', () => {
    // Only two actors exist, so the rule is not currently testable beyond this - but
    // the cap is a rule over actors rather than a hardcoded shape, which is the point.
    const state = running()
    expect(maxConcurrentActivities(state)).toBe(2)
  })

  it('produces more together than the mech alone', () => {
    // Stocked with ingots up front. A bare producer/consumer pair stalls instantly:
    // the crawler halts on missing inputs long before the mech has refined five of
    // them, and a halted action never restarts on its own.
    const stocked = () => {
      const s = running()
      s.bank['steel_ingot'] = 500
      return s
    }
    const solo = tickBy(startSkillAction(stocked(), 'refining', 'smelt_steel'), 600, 0.5)

    let both = stocked()
    both = startSkillAction(both, 'refining', 'smelt_steel')
    both = startSkillAction(both, 'fabrication', 'fab_frame_steel', 'crawler')
    both = tickBy(both, 600, 0.5)

    const base = xpForLevel(20)
    expect(both.skills.refining).toBeCloseTo(solo.skills.refining, 0)
    expect(both.skills.fabrication - base).toBeGreaterThan(0)
    expect(solo.skills.fabrication - base).toBe(0)
  })
})

describe('what the crawler will and will not do', () => {
  it('runs industry only', () => {
    for (const skill of CRAWLER_SKILLS) expect(canCrawlerRun(skill)).toBe(true)
    expect(canCrawlerRun('scavenging')).toBe(false)
    expect(canCrawlerRun('cartography')).toBe(false)
  })

  it('refuses a job that is not its own', () => {
    const state = running()
    const after = startSkillAction(state, 'scavenging', 'roadside_wrecks', 'crawler')
    expect(after).toBe(state)
    expect(after.actors.crawler.activity).toBeNull()
  })

  it('never travels to work, because it carries the workshop', () => {
    // Refining is listed at the camp, but the crawler can be anywhere.
    let state = running()
    state.actors.crawler.at = 'slag_fields'
    state = startSkillAction(state, 'refining', 'smelt_steel', 'crawler')

    expect(state.actors.crawler.travel).toBeNull()
    state = tickBy(state, 120, 0.5)
    expect(state.actors.crawler.at).toBe('slag_fields')
    expect(state.bank['steel_ingot']).toBeGreaterThan(0)
  })

  it('halts when its materials run out, like anything else', () => {
    let state = running()
    state.bank['scrap_steel'] = 3
    state = startSkillAction(state, 'refining', 'smelt_steel', 'crawler')
    state = tickBy(state, 120, 0.5)
    expect(state.actors.crawler.stoppedReason).toBe('missing-inputs')
  })
})

describe('driving it', () => {
  it('moves slower than you, and never uses your waypoints', () => {
    const state = running()
    state.skills.cartography = xpForLevel(99) // every waypoint open
    expect(moveSpeedOf(state, 'crawler')).toBe(CRAWLER_MOVE_SPEED)
    expect(moveSpeedOf(state, 'crawler')).toBeLessThan(moveSpeedOf(state, 'mech'))

    const driving = moveCrawler(state, 'slag_fields')
    // A waypoint hop would be a fixed few seconds; the crawler has to drive it.
    expect(driving.actors.crawler.travel!.legSeconds).toBeGreaterThan(10)
  })

  it('arrives, and works again once it stops', () => {
    let state = moveCrawler(running(), 'roadside')
    state = startSkillAction(state, 'refining', 'smelt_steel', 'crawler')
    state = tickBy(state, 600, 0.5)

    expect(state.actors.crawler.at).toBe('roadside')
    expect(state.actors.crawler.travel).toBeNull()
    expect(state.bank['steel_ingot']).toBeGreaterThan(0)
  })

  it('does no work while driving', () => {
    // Travel eats the step before the activity gets any, same as for the mech.
    let state = moveCrawler(running(), 'vitrified_zone')
    state = startSkillAction(state, 'refining', 'smelt_steel', 'crawler')

    const smelt = getAction('refining', 'smelt_steel')!
    const early = tickBy(state, smelt.duration * 2, 0.5)
    expect(early.actors.crawler.travel).not.toBeNull()
    expect(early.bank['steel_ingot']).toBeUndefined()
  })

  it('ignores an order to drive nowhere', () => {
    const state = running()
    expect(moveCrawler(state, state.actors.crawler.at)).toBe(state)
  })

  it('will not move while asleep', () => {
    const asleep = newGame()
    expect(moveCrawler(asleep, 'roadside')).toBe(asleep)
  })
})

describe('the crawler and the offline guarantee', () => {
  it('keeps one big step equal to many small ones with both working', () => {
    const make = () => {
      let s = running(9182)
      s = startSkillAction(s, 'scavenging', 'roadside_wrecks')
      return startSkillAction(s, 'refining', 'smelt_steel', 'crawler')
    }
    const bulk = tick(make(), 3600)
    const incremental = tickBy(make(), 3600, 0.25)

    expect(incremental.bank).toEqual(bulk.bank)
    expect(incremental.skills).toEqual(bulk.skills)
    expect(incremental.rngSeed).toBe(bulk.rngSeed)
  })

  it('keeps working while you are stopped', () => {
    let state = startSkillAction(running(), 'refining', 'smelt_steel', 'crawler')
    state = stopActivity(state)
    state = tickBy(state, 300, 0.5)

    expect(state.actors.mech.activity).toBeNull()
    expect(state.bank['steel_ingot']).toBeGreaterThan(0)
  })
})
