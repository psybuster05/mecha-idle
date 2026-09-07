/**
 * Player intents - every way the UI is allowed to change the game.
 *
 * All pure: they clone and return a new state, so React can hold them in refs and
 * compare snapshots without worrying about aliasing. Keeping them here rather than in
 * the UI means the rules stay testable and the UI stays a view.
 */

import { equipItem, unequipSlot, type EquipFailure } from './equipment'
import { nodesForAction, nodesForZone } from '../content/world'
import { cloneState, haltActivity, setActivity } from './state'
import { routeTo } from './world'
import type { ActionId, ActorId, EquipSlot, GameState, GatheringSkillId, ItemId, ZoneId } from './state'

/** Point the mech at a gathering action. Returns the same state if it is not allowed. */
export function startSkillAction(
  state: GameState,
  skill: GatheringSkillId,
  action: ActionId,
  actor: ActorId = 'mech',
): GameState {
  const next = cloneState(state)
  if (!setActivity(next, actor, { kind: 'skill', skill, action })) return state

  // Actions happen somewhere. Walk there first; the activity is the intent until we
  // arrive, and the tick loop will not start producing until travel finishes.
  const where = nodesForAction(skill, action).map((n) => n.id)
  if (routeTo(next, actor, where) === null) {
    haltActivity(next, actor, 'unreachable')
    return next
  }
  return next
}

/** Deploy into a combat zone. */
export function startCombat(
  state: GameState,
  zone: ZoneId,
  enemy?: string,
  actor: ActorId = 'mech',
): GameState {
  const next = cloneState(state)
  if (!setActivity(next, actor, { kind: 'combat', zone, enemy })) return state

  const where = nodesForZone(zone).map((n) => n.id)
  if (routeTo(next, actor, where) === null) {
    haltActivity(next, actor, 'unreachable')
    return next
  }
  // Redeploying always starts a clean engagement rather than resuming a half-dead
  // enemy from a previous sortie.
  next.combat.enemyId = null
  next.combat.enemyHp = 0
  next.combat.enemyAttackProgress = 0
  next.combat.attackProgress = 0
  next.combat.respawnProgress = 0
  next.combat.carryOver = 0
  return next
}

/** Stop whatever an actor is doing. Deliberate, so it records no stop reason. */
export function stopActivity(state: GameState, actor: ActorId = 'mech'): GameState {
  const next = cloneState(state)
  setActivity(next, actor, null)
  return next
}

/** Acknowledge a halt notice without starting anything new. */
export function clearStopReason(state: GameState, actor: ActorId = 'mech'): GameState {
  if (state.actors[actor].stoppedReason === null) return state
  const next = cloneState(state)
  next.actors[actor].stoppedReason = null
  return next
}

export function equip(
  state: GameState,
  itemId: ItemId,
): { state: GameState; error: EquipFailure | null } {
  const next = cloneState(state)
  const error = equipItem(next, itemId)
  return error ? { state, error } : { state: next, error: null }
}

export function unequip(state: GameState, slot: EquipSlot): GameState {
  if (!state.equipment[slot]) return state
  const next = cloneState(state)
  unequipSlot(next, slot)
  return next
}

/** Used by combat when the mech is destroyed. Exposed for tests and debug tooling. */
export function halt(state: GameState, actor: ActorId, reason: 'destroyed'): GameState {
  const next = cloneState(state)
  haltActivity(next, actor, reason)
  return next
}
