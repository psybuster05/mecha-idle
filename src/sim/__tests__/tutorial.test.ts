import { describe, it, expect } from 'vitest'
import { TUTORIAL } from '../../content/tutorial'
import { DEMO_PACE } from '../pace'
import { startSkillAction } from '../intents'
import { isUnlocked, nextStage, unlockedSkills } from '../tutorial'
import { advance } from '../tick'
import { waitingFor } from '../skillEngine'
import { newGame, GATHERING_SKILLS, type GatheringSkillId } from '../state'
import { levelFromXp } from '../xp'

/**
 * The opening.
 *
 * One subroutine at a time, each gated behind the skill that feeds it. These tests hold
 * the three things that would quietly ruin it: a stage that cannot be reached by playing,
 * a stage that takes something away from an existing save, and a gate that exists only in
 * the rail rather than in the rules.
 */

describe('the shape of the chain', () => {
  it('covers every gathering skill', () => {
    for (const skill of GATHERING_SKILLS) {
      expect(TUTORIAL.some((s) => s.unlocks === skill), `${skill} has no stage`).toBe(true)
    }
  })

  it('never asks for a skill that is not already open', () => {
    // Walking the table in order, each requirement must name something an earlier stage
    // handed back. A gate on a skill you cannot reach yet is a dead end, and it would
    // only show up as a player sitting on a rail that never grows.
    const open = new Set<string>()
    for (const stage of TUTORIAL) {
      if (stage.requires) {
        expect(open.has(stage.requires.skill), `${stage.unlocks} needs ${stage.requires.skill}`).toBe(true)
      }
      open.add(stage.unlocks)
    }
  })

  it('opens with exactly one skill', () => {
    const state = newGame()
    expect(unlockedSkills(state)).toEqual(['scavenging'])
    expect(nextStage(state)?.unlocks).toBe('refining')
  })
})

describe('the gate is a rule, not a rail', () => {
  it('refuses to start a skill that has not been recovered', () => {
    const state = newGame()
    const started = startSkillAction(state, 'refining', 'smelt_steel')
    expect(started.actors.mech.activity).toBeNull()
    expect(started).toBe(state)
  })

  it('allows it the moment the requirement is met', () => {
    const state = newGame()
    state.skills.scavenging = 500 // comfortably past Scavenging 5
    expect(isUnlocked(state, 'refining')).toBe(true)
    expect(startSkillAction(state, 'refining', 'smelt_steel').actors.mech.activity).not.toBeNull()
  })
})

describe('nothing is ever taken away', () => {
  it('keeps a skill that already has progress, whatever the requirement says', () => {
    // Saves predate this chain, and materials drop in combat too, so somebody can
    // plausibly hold Refining levels with Scavenging still at 1. Hiding a skill they
    // have trained would be taking progress away.
    const state = newGame()
    state.skills.refining = 1
    expect(levelFromXp(state.skills.scavenging)).toBe(1)
    expect(isUnlocked(state, 'refining')).toBe(true)
  })

  it('does not close again when the bank is emptied', () => {
    // Monotonic, the same rule story triggers keep. A bank count could flip back and a
    // single large offline step could miss a condition many small ones caught.
    const state = newGame()
    state.skills.scavenging = 500
    expect(isUnlocked(state, 'refining')).toBe(true)
    state.bank = {}
    expect(isUnlocked(state, 'refining')).toBe(true)
  })
})

/**
 * The one that matters: can somebody actually get there by playing?
 *
 * Modelled as a player who works the deepest skill they have and drops back to whatever
 * feeds it the moment they run dry - which is the whole lesson the chain is teaching. No
 * combat, so this doubles as proof that the opening keeps the no-gating contract.
 */
describe('walking the whole chain', () => {
  const FEEDS: Record<GatheringSkillId, GatheringSkillId | null> = {
    scavenging: null,
    refining: 'scavenging',
    fabrication: 'refining',
    salvaging: 'fabrication',
  }

  /**
   * The obvious thread, pinned rather than picked by rate.
   *
   * A player following the chain smelts scrap into ingots because they want a frame. A
   * model that always takes the best xp per second does not: at Refining 10 it switches
   * to drawing copper wire, which consumes something else entirely, and fabrication
   * starves behind it forever. That is a flaw in the model, not in the game - but it is
   * exactly the trap this test exists to avoid falling into, so the route is written down.
   */
  const THREAD: Record<GatheringSkillId, string> = {
    scavenging: 'roadside_wrecks',
    refining: 'smelt_steel',
    fabrication: 'fab_frame_steel',
    salvaging: 'strip_frame_steel',
  }

  it('reaches every stage without fighting, in a sitting', () => {
    let state = newGame()
    let seconds = 0
    const reached = new Map<string, number>()
    // Fabrication is the deepest thing worth working: Salvaging, the last stage, hangs off
    // it, and everything else is on the way to it.
    const target = (): GatheringSkillId =>
      isUnlocked(state, 'fabrication') ? 'fabrication' : isUnlocked(state, 'refining') ? 'refining' : 'scavenging'

    while (seconds < 20 * 3600 && nextStage(state) !== null) {
      let skill = target()
      // Drop back down the chain until we are on something we can actually do.
      let guard = 0
      for (;;) {
        state = startSkillAction(state, skill, THREAD[skill])
        if (waitingFor(state, 'mech').length === 0 || guard++ > 4) break
        const feeder = FEEDS[skill]
        if (!feeder) break
        skill = feeder
      }
      advance(state, 30)
      seconds += 30
      for (const stage of TUTORIAL) {
        if (isUnlocked(state, stage.unlocks) && !reached.has(stage.unlocks)) {
          reached.set(stage.unlocks, seconds)
        }
      }
    }

    const minutes = (id: string) => (reached.get(id) ?? Infinity) / 60 / DEMO_PACE
    for (const stage of TUTORIAL) {
      expect(reached.has(stage.unlocks), `${stage.unlocks} was never reached`).toBe(true)
    }
    console.log(
      'TUTORIAL real minutes',
      TUTORIAL.map((s) => `${s.unlocks}:${minutes(s.unlocks).toFixed(1)}`).join('  '),
    )
    // A sitting, not an evening. This is the number the whole demo pace was chosen for.
    expect(minutes('salvaging'), 'the four skills').toBeLessThan(20)
  }, 30_000)
})
