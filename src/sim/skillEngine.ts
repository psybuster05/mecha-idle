/**
 * The generic engine behind every non-combat skill.
 *
 * An action is data: `{ duration, inputs, outputs, drops, xp, levelRequired }`.
 * Scavenging, Refining and Fabrication all run through this one function - they differ
 * only in their content tables. Adding a fourth skill should require no code here.
 */

import { getAction } from '../content'
import { perkTotal } from '../content/enemies'
import type { ItemStack, SkillAction } from '../content/types'
import { addItem, count, grantAll, maxCraftable, payCost } from './bank'
import { Rng } from './rng'
import { haltActivity, type ActorId, type GameState } from './state'
import { derivedStats } from './stats'
import { levelFromXp } from './xp'

/**
 * Seconds per completion after modifiers.
 *
 * Equipment may scale this, and that is safe for the bulk-completion path: equipment
 * cannot change part-way through a tick, only between ticks via an intent.
 *
 * IMPORTANT: it must never become *level*-dependent. Levels do change mid-tick, so a
 * long offline stretch would be simulated entirely at the stale starting speed. If that
 * is ever wanted, cap the bulk path at the next level-up boundary and recompute - which
 * is exactly what combat has to do after every kill.
 */
export function actionDuration(state: GameState, action: SkillAction): number {
  return action.duration * derivedStats(state).skillDurationScale
}

/**
 * Roll every chance-based drop, once per completion.
 *
 * Rolls happen in a fixed order - completion by completion, drop by drop - so that
 * applying N completions in bulk consumes the RNG exactly as N single completions
 * would. That equivalence is what makes offline progress match online play, and it is
 * asserted directly in the offline tests.
 */
function rollDrops(state: GameState, action: SkillAction, completions: number): void {
  if (!action.drops?.length) return
  const rng = new Rng(state.rngSeed)
  for (let i = 0; i < completions; i++) {
    for (const drop of action.drops) {
      if (rng.chance(drop.chance)) addItem(state, drop.item, drop.qty)
    }
  }
  state.rngSeed = rng.seed
}

/** Mutates. Advances whatever skill action `actorId` is running by `dt` seconds. */
export function advanceSkillActivity(state: GameState, actorId: ActorId, dt: number): void {
  const actor = state.actors[actorId]
  const activity = actor.activity
  if (activity?.kind !== 'skill') return

  const action = getAction(activity.skill, activity.action)
  if (!action) {
    haltActivity(state, actorId, 'unknown-action')
    return
  }
  if (levelFromXp(state.skills[activity.skill]) < action.levelRequired) {
    haltActivity(state, actorId, 'level-too-low')
    return
  }

  const duration = actionDuration(state, action)
  if (!(duration > 0)) return // bad data; refuse to divide by zero

  // Inputs are consumed linearly, so checking affordability once against the starting
  // bank gives the same answer as checking before each completion.
  const affordable = maxCraftable(state, action.inputs)

  // **Waiting, not halting.** Progress is capped at what the bank can actually pay for,
  // so an actor short of materials simply stops accumulating rather than banking time it
  // could not have used. That matters now there are two actors: the crawler running out
  // of ingots while the mech is busy refining more is an ordinary, temporary state, not
  // a failure - and a halted action never restarts on its own.
  //
  // The cap is also what keeps this honest across step sizes. Without it a large offline
  // step would accumulate hours of progress against an empty bank and then spend it the
  // instant a single input appeared.
  const ceiling = affordable * duration
  actor.progress = Math.min(actor.progress + dt, ceiling)

  const wanted = Math.floor(actor.progress / duration)
  const applied = Math.min(wanted, affordable)
  if (applied <= 0) return

  if (applied > 0) {
    payCost(state, action.inputs, applied)
    grantAll(state, action.outputs, applied)

    // Yield perks are a chance of a bonus haul per completion, rolled one at a time,
    // rather than a multiplier on the total. A multiplier would round differently for
    // one big step than for many small ones and break the offline guarantee.
    const bonusChance = perkTotal(state.defeated, 'gatheringYield')
    if (bonusChance > 0) {
      const rng = new Rng(state.rngSeed)
      let bonus = 0
      for (let i = 0; i < applied; i++) if (rng.chance(bonusChance)) bonus++
      state.rngSeed = rng.seed
      if (bonus > 0) grantAll(state, action.outputs, bonus)
    }

    rollDrops(state, action, applied)
    // Left unrounded on purpose: rounding here would also differ between one large
    // step and many small ones.
    state.skills[activity.skill] += action.xp * applied * (1 + perkTotal(state.defeated, 'xpBonus'))
  }

  actor.progress -= applied * duration
}

/**
 * What an actor is short of, if anything.
 *
 * Derived rather than stored: waiting is not a state the simulation records, it is
 * simply what an actor with an unaffordable action looks like. The UI says so out loud
 * so that "nothing is happening" always has a visible reason.
 */
export function waitingFor(state: GameState, actorId: ActorId): ItemStack[] {
  const activity = state.actors[actorId].activity
  if (activity?.kind !== 'skill') return []

  const action = getAction(activity.skill, activity.action)
  if (!action?.inputs) return []
  if (maxCraftable(state, action.inputs) > 0) return []

  return action.inputs.filter((stack) => count(state, stack.item) < stack.qty)
}
