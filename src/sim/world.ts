/**
 * Movement between world nodes.
 *
 * Travel is part of the simulation, not the presentation layer. That is what makes it
 * survive offline catch-up: coming back after eight hours credits the walk and then the
 * work, exactly as live play would. The sprite on screen only ever reads these numbers.
 */

import { ADJACENCY, getNode, nodeDistance } from '../content/world'
import { WAYPOINTS, WAYPOINT_TRAVEL_SECONDS } from '../content/skills/cartography'
import { levelFromXp } from './xp'
import {
  hasDefeated,
  recordVisit,
  type ActorId,
  type GameState,
  type NodeId,
  type TravelState,
} from './state'
import { derivedStats } from './stats'

export { BASE_MOVE_SPEED } from './stats'

/**
 * Cheapest route from `from` to `to`, as the hops to walk in order (excluding `from`).
 *
 * Dijkstra rather than plain BFS because edges carry a difficulty multiplier, so the
 * route with the fewest hops is not always the quickest one.
 *
 * `isOpen` filters out places that are still locked. It never excludes `from` -
 * standing somewhere that has since closed should not strand you there.
 *
 * Returns `[]` when already there, or `null` when unreachable.
 */
export function findPath(
  from: NodeId,
  to: NodeId,
  isOpen: (id: NodeId) => boolean = () => true,
): NodeId[] | null {
  if (from === to) return []
  if (!getNode(from) || !getNode(to)) return null
  if (!isOpen(to)) return null

  const dist = new Map<NodeId, number>([[from, 0]])
  const prev = new Map<NodeId, NodeId>()
  const settled = new Set<NodeId>()

  // The graph is a handful of nodes, so a linear scan for the nearest unsettled node
  // is faster in practice than maintaining a heap, and far easier to read.
  for (;;) {
    let current: NodeId | null = null
    let best = Infinity
    for (const [node, d] of dist) {
      if (!settled.has(node) && d < best) {
        best = d
        current = node
      }
    }
    if (current === null) return null
    if (current === to) break

    settled.add(current)
    for (const edge of ADJACENCY.get(current) ?? []) {
      if (!isOpen(edge.to)) continue
      const candidate = best + edge.length
      if (candidate < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, candidate)
        prev.set(edge.to, current)
      }
    }
  }

  const path: NodeId[] = []
  for (let step: NodeId | undefined = to; step !== undefined && step !== from; step = prev.get(step)) {
    path.unshift(step)
  }
  return path
}

/** Seconds to walk one hop at `speed` map units per second. */
export function hopSeconds(from: NodeId, to: NodeId, speed: number): number {
  const a = getNode(from)
  const b = getNode(to)
  if (!a || !b) return 0
  const edge = ADJACENCY.get(from)?.find((e) => e.to === to)
  // Fall back to straight-line distance if the nodes are not actually adjacent.
  const length = edge?.length ?? nodeDistance(a, b)
  return length / Math.max(1, speed)
}

/** Build the travel state for a route. Returns null if there is nothing to walk. */
export function beginTravel(
  from: NodeId,
  path: readonly NodeId[],
  speed: number,
): TravelState | null {
  const [next, ...remaining] = path
  if (!next) return null
  return {
    from,
    to: next,
    progress: 0,
    legSeconds: hopSeconds(from, next, speed),
    remaining,
  }
}

/**
 * Mutates. Walks `actorId` for up to `dt` seconds.
 *
 * Returns the seconds left over once the destination is reached, so the caller can
 * spend the remainder actually working. Without that, a single large offline step
 * would arrive and then stand still until the next tick.
 */
export function advanceTravel(state: GameState, actorId: ActorId, dt: number): number {
  const actor = state.actors[actorId]
  let remainingDt = dt
  const speed = derivedStats(state).moveSpeed

  while (actor.travel && remainingDt > 0) {
    const travel = actor.travel

    // Zero-length or malformed hop: arrive immediately rather than spinning.
    if (!(travel.legSeconds > 0)) {
      actor.at = travel.to
      recordVisit(state, travel.to)
      actor.travel = beginTravel(travel.to, travel.remaining, speed)
      continue
    }

    const needed = travel.legSeconds - travel.progress
    if (remainingDt < needed) {
      travel.progress += remainingDt
      return 0
    }

    remainingDt -= needed
    actor.at = travel.to
    recordVisit(state, travel.to)
    actor.travel = beginTravel(travel.to, travel.remaining, speed)
  }

  return remainingDt
}

/** Where an actor is on the map right now, interpolated mid-walk. For rendering only. */
export function actorPosition(state: GameState, actorId: ActorId): { x: number; y: number } {
  const actor = state.actors[actorId]
  const here = getNode(actor.at)
  const origin = { x: here?.x ?? 0, y: here?.y ?? 0 }
  if (!actor.travel) return origin

  const target = getNode(actor.travel.to)
  if (!target) return origin

  const t = actor.travel.legSeconds > 0
    ? Math.min(1, actor.travel.progress / actor.travel.legSeconds)
    : 1
  return {
    x: origin.x + (target.x - origin.x) * t,
    y: origin.y + (target.y - origin.y) * t,
  }
}

/**
 * Of several candidate destinations, the one that is quickest to reach.
 *
 * Skill actions and combat zones can be available at more than one place, so
 * "go and do this" has to pick a where. Cost is edge length, not hop count.
 */
export function findNearest(
  from: NodeId,
  candidates: readonly NodeId[],
  isOpen: (id: NodeId) => boolean = () => true,
): { node: NodeId; path: NodeId[]; length: number } | null {
  let best: { node: NodeId; path: NodeId[]; length: number } | null = null

  for (const candidate of candidates) {
    const path = findPath(from, candidate, isOpen)
    if (!path) continue

    let length = 0
    let cursor = from
    for (const hop of path) {
      const edge = ADJACENCY.get(cursor)?.find((e) => e.to === hop)
      length += edge?.length ?? 0
      cursor = hop
    }

    if (!best || length < best.length) best = { node: candidate, path, length }
  }
  return best
}

/**
 * Mutates. Sends `actorId` toward the nearest of `candidates`.
 *
 * Returns true if the actor is already there (so work can start immediately), false
 * if it is now walking, or null if nowhere is reachable.
 */
export function routeTo(
  state: GameState,
  actorId: ActorId,
  candidates: readonly NodeId[],
): boolean | null {
  const actor = state.actors[actorId]
  if (candidates.includes(actor.at)) {
    actor.travel = null
    return true
  }

  // A waypoint is a fixed short hop however far it is, which is the whole reward for
  // levelling Cartography. Checked before pathfinding, because the point is not to walk.
  const waypoint = candidates.find((id) => isNodeOpen(state, id) && isWaypoint(state, id))
  if (waypoint) {
    actor.travel = {
      from: actor.at,
      to: waypoint,
      progress: 0,
      legSeconds: WAYPOINT_TRAVEL_SECONDS,
      remaining: [],
    }
    return false
  }

  const route = findNearest(actor.at, candidates, (id) => isNodeOpen(state, id))
  if (!route) return null

  actor.travel = beginTravel(actor.at, route.path, derivedStats(state).moveSpeed)
  return actor.travel === null
}

/**
 * Whether a place can currently be entered.
 *
 * Locked places are gated on a boss. Note the rule this deliberately does not break:
 * nowhere carrying a gathering action may be locked, so no skill ladder is ever behind
 * a fight. See CLAUDE.md, and the test that enforces it.
 */
export function isNodeOpen(state: GameState, id: NodeId): boolean {
  const node = getNode(id)
  if (!node) return false
  return !node.unlockedBy || hasDefeated(state, node.unlockedBy)
}

/** Whether Cartography has established a waypoint at this place. */
export function isWaypoint(state: GameState, node: NodeId): boolean {
  const waypoint = WAYPOINTS.find((w) => w.node === node)
  if (!waypoint) return false
  return levelFromXp(state.skills.cartography) >= waypoint.level
}

/**
 * Seconds to reach a destination, accounting for waypoints.
 *
 * A waypoint is a fixed short hop however far away it is - that is the whole reward for
 * levelling Cartography, and it is what makes the far corners of the map bearable once
 * the world is twenty-four places wide.
 */
export function travelSecondsTo(state: GameState, from: NodeId, to: NodeId): number | null {
  if (from === to) return 0
  if (isWaypoint(state, to)) return WAYPOINT_TRAVEL_SECONDS

  const route = findNearest(from, [to], (id) => isNodeOpen(state, id))
  if (!route) return null
  return route.length / Math.max(1, derivedStats(state).moveSpeed)
}
