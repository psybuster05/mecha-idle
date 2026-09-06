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

  for (const actorId of ACTOR_IDS) {
    const actor = state.actors[actorId]
    if (!actor.unlocked || !actor.activity) continue

    switch (actor.activity.kind) {
      case 'skill':
        advanceSkillActivity(state, actorId, dt)
        break
      case 'combat':
        advanceCombatActivity(state, actorId, dt)
        break
    }
  }
}
