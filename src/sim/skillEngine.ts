/**
 * The generic engine behind every non-combat skill.
 *
 * An action is data: `{ duration, inputs, outputs, drops, xp, levelRequired }`.
 * Scavenging, Refining and Fabrication all run through this one function - they differ
 * only in their content tables. Adding a fourth skill should require no code here.
 */

import { getAction } from '../content'
import type { SkillAction } from '../content/types'
import { addItem, grantAll, maxCraftable, payCost } from './bank'
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

  actor.progress += dt
  const wanted = Math.floor(actor.progress / duration)
  if (wanted <= 0) return

  // Inputs are consumed linearly, so checking affordability once against the
  // starting bank gives the same answer as checking before each completion.
  const affordable = maxCraftable(state, action.inputs)
  const applied = Math.min(wanted, affordable)

  if (applied > 0) {
    payCost(state, action.inputs, applied)
    grantAll(state, action.outputs, applied)
    rollDrops(state, action, applied)
    state.skills[activity.skill] += action.xp * applied
  }

  if (applied < wanted) {
    // Ran out of materials partway through. Halt loudly instead of spinning on
    // an action that can no longer produce anything.
    haltActivity(state, actorId, 'missing-inputs')
    return
  }

  actor.progress -= applied * duration
}
