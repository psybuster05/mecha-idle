/**
 * Places.
 *
 * Travel used to live here. It was removed because a walk you cannot watch is a cost
 * with no feedback - this is a menu game, and getting somewhere is now instant.
 *
 * What survives is the part that still earns its keep: places gate content. A node
 * behind a boss is shut, and moving an actor is simply a matter of putting it there.
 */

import { getNode } from '../content/world'
import { hasDefeated, recordVisit, type ActorId, type GameState, type NodeId } from './state'

/**
 * Whether a place can be entered.
 *
 * Locked places are gated on a boss. Nowhere carrying a gathering action may be locked
 * in a way that blocks a skill ladder - see the gating rule in CLAUDE.md and the pacing
 * tests that measure it.
 */
export function isNodeOpen(state: GameState, id: NodeId): boolean {
  const node = getNode(id)
  if (!node) return false
  return !node.unlockedBy || hasDefeated(state, node.unlockedBy)
}

/**
 * Mutates. Puts an actor somewhere, if it is open. Returns whether it worked.
 *
 * Instant by design. The graph edges still exist for the map to draw, but nothing walks
 * them any more.
 */
export function placeActor(state: GameState, actorId: ActorId, node: NodeId): boolean {
  if (!isNodeOpen(state, node)) return false
  state.actors[actorId].at = node
  recordVisit(state, node)
  return true
}

/**
 * Mutates. Moves an actor to the first of `candidates` it can enter.
 *
 * Returns true if it is somewhere it can do the job, false if nowhere is open.
 */
export function moveToAny(
  state: GameState,
  actorId: ActorId,
  candidates: readonly NodeId[],
): boolean {
  if (candidates.includes(state.actors[actorId].at)) return true
  const open = candidates.find((id) => isNodeOpen(state, id))
  if (!open) return false
  return placeActor(state, actorId, open)
}

/** Where an actor is, for drawing. */
export function actorPosition(state: GameState, actorId: ActorId): { x: number; y: number } {
  const node = getNode(state.actors[actorId].at)
  return { x: node?.x ?? 0, y: node?.y ?? 0 }
}
