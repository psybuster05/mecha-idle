/**
 * The simulation clock.
 *
 * `tick` is the only entry point the UI and the offline catch-up both go through, and
 * it is pure: same state and same dt always give the same result. Everything below it
 * mutates a clone.
 */

import { advanceCombatActivity } from './combat'
import { advanceSkillActivity } from './skillEngine'
import { ACTOR_IDS, cloneState, type GameState } from './state'
import { derivedStats, HP_REGEN_PER_SECOND } from './stats'
import { advanceTravel } from './world'

/** Pure. Returns a new state advanced by `dtSeconds`. */
export function tick(state: GameState, dtSeconds: number): GameState {
  const next = cloneState(state)
  advance(next, dtSeconds)
  return next
}

/** Mutates `state`. The in-place worker behind `tick`. */
export function advance(state: GameState, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return

  state.elapsed += dt

  // Out of combat, the reactor patches you up. In combat the same regeneration is
  // applied inside the event loop instead, so it interleaves with incoming damage
  // rather than all arriving at once - applying it here too would double-count.
  const fighting =
    state.actors.mech.activity?.kind === 'combat' && state.actors.mech.travel === null
  if (!fighting) {
    const max = derivedStats(state).maxHp
    if (state.combat.hp > 0 && state.combat.hp < max) {
      state.combat.hp = Math.min(max, state.combat.hp + max * HP_REGEN_PER_SECOND * dt)
    }
  }

  for (const actorId of ACTOR_IDS) {
    const actor = state.actors[actorId]
    if (!actor.unlocked) continue

    // Walking comes first, and hands back whatever time is left once the actor
    // arrives - so one large offline step both travels and then works, rather than
    // arriving and standing idle until the next tick.
    let working = dt
    if (actor.travel) working = advanceTravel(state, actorId, dt)
    if (!actor.activity || working <= 0) continue

    switch (actor.activity.kind) {
      case 'skill':
        advanceSkillActivity(state, actorId, working)
        break
      case 'combat':
        advanceCombatActivity(state, actorId, working)
        break
    }
  }
}
