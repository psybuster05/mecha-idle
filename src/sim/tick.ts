/**
 * The simulation clock.
 *
 * `tick` is the only entry point the UI and the offline catch-up both go through, and
 * it is pure: same state and same dt always give the same result. Everything below it
 * mutates a clone.
 */

import { advanceCombatActivity } from './combat'
import { burnFuelFor, effectiveSpeed, secondsOfFuel } from './fuel'
import { advanceSkillActivity } from './skillEngine'
import { ACTOR_IDS, cloneState, type GameState } from './state'
import { derivedStats, HP_REGEN_PER_SECOND } from './stats'
import { advanceStory } from './story'

/** Pure. Returns a new state advanced by `dtSeconds`. */
export function tick(state: GameState, dtSeconds: number): GameState {
  const next = cloneState(state)
  advance(next, dtSeconds)
  return next
}

/**
 * Mutates `state`. The in-place worker behind `tick`.
 *
 * Splits the step at the moment the fuel runs out before doing anything else. Action
 * duration depends on whether fuel is burning, so a single large step spanning that
 * moment would apply one rate to the whole span while many small steps applied both -
 * exactly the divergence that would break offline progress. Splitting keeps them
 * identical.
 */
export function advance(state: GameState, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return

  const fuelLeft = secondsOfFuel(state)
  if (fuelLeft > 0 && fuelLeft < dt) {
    advanceStep(state, fuelLeft)
    advanceStep(state, dt - fuelLeft)
    return
  }

  advanceStep(state, dt)
}

function advanceStep(state: GameState, dt: number): void {
  state.elapsed += dt

  // Out of combat, the reactor patches you up. In combat the same regeneration is
  // applied inside the event loop instead, so it interleaves with incoming damage
  // rather than all arriving at once - applying it here too would double-count.
  const fighting = state.actors.mech.activity?.kind === 'combat'
  if (!fighting) {
    const max = derivedStats(state).maxHp
    if (state.combat.hp > 0 && state.combat.hp < max) {
      state.combat.hp = Math.min(max, state.combat.hp + max * HP_REGEN_PER_SECOND * dt)
    }
  }

  // Evaluated after the world has moved, so a beat keyed on arriving somewhere or
  // beating something fires in the same step that made it true.
  for (const actorId of ACTOR_IDS) {
    const actor = state.actors[actorId]
    if (!actor.unlocked) continue

    if (!actor.activity) continue

    switch (actor.activity.kind) {
      case 'skill':
        advanceSkillActivity(state, actorId, dt)
        break
      case 'combat':
        // Combat is fast-forwarded rather than made easier: the whole fight runs at
        // speed, your swings and the enemy's alike, so the outcome is identical and
        // only the wall-clock cost changes. Scaling one side would have been a power
        // boost, and every boss budget was measured without one.
        advanceCombatActivity(state, actorId, dt * effectiveSpeed(state))
        break
    }
  }

  advanceStory(state)

  // Burned *after* the work, not before. Draining first meant the boosted half of a
  // split step had already lost its boost by the time anything happened, which made one
  // large step produce a third less than many small ones - precisely the divergence the
  // split exists to prevent.
  burnFuelFor(state, dt)
}
