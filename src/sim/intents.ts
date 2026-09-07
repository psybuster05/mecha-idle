/**
 * Player intents - every way the UI is allowed to change the game.
 *
 * All pure: they clone and return a new state, so React can hold them in refs and
 * compare snapshots without worrying about aliasing. Keeping them here rather than in
 * the UI means the rules stay testable and the UI stays a view.
 */

import { equipItem, unequipSlot, type EquipFailure } from './equipment'
import { removeItem } from './bank'
import { getItem } from '../content'
import { nodesForAction, nodesForZone } from '../content/world'
import { canCrawlerRun, cloneState, haltActivity, markStorySeen, setActivity } from './state'
import { routeTo } from './world'
import type {
  ActionId,
  ActorId,
  EquipSlot,
  GameState,
  GatheringSkillId,
  ItemId,
  NodeId,
  ZoneId,
} from './state'

/** Point the mech at a gathering action. Returns the same state if it is not allowed. */
export function startSkillAction(
  state: GameState,
  skill: GatheringSkillId,
  action: ActionId,
  actor: ActorId = 'mech',
): GameState {
  // The crawler is a workshop on tracks and only ever runs industry, so it never has to
  // go anywhere to work - it carries the furnace with it.
  if (actor === 'crawler' && !canCrawlerRun(skill)) return state

  const next = cloneState(state)

  // setActivity clears travel, which is right for the mech - its activity is what
  // decides where it goes. The crawler works wherever it is, so new orders must not
  // cancel a drive already under way. It simply produces nothing until it parks.
  const keptTravel = actor === 'crawler' ? next.actors.crawler.travel : null
  if (!setActivity(next, actor, { kind: 'skill', skill, action })) return state

  if (actor === 'crawler') {
    next.actors.crawler.travel = keptTravel
    return next
  }

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

/** Mark one story beat as read. */
export function readStoryBeat(state: GameState, id: string): GameState {
  if (!state.story.pending.includes(id)) return state
  const next = cloneState(state)
  markStorySeen(next, id)
  return next
}

/** Mark every waiting beat as read. Used when the Log is opened. */
export function readAllStoryBeats(state: GameState, ids: readonly string[]): GameState {
  const unread = ids.filter((id) => state.story.pending.includes(id))
  if (unread.length === 0) return state
  const next = cloneState(state)
  for (const id of unread) markStorySeen(next, id)
  return next
}

export type BurnFailure = 'not-fuel' | 'not-in-bank' | 'already-burning'

/**
 * Burn one fuel item.
 *
 * Refuses while something is already burning rather than stacking or extending -
 * stacking would make hoarding correct, and the whole point is that fuel is spent the
 * moment you find it.
 */
export function burnFuel(
  state: GameState,
  itemId: ItemId,
): { state: GameState; error: BurnFailure | null } {
  const fuel = getItem(itemId)?.fuel
  if (!fuel) return { state, error: 'not-fuel' }
  if ((state.bank[itemId] ?? 0) < 1) return { state, error: 'not-in-bank' }
  if (state.boost && state.boost.secondsRemaining > 0) {
    return { state, error: 'already-burning' }
  }

  const next = cloneState(state)
  removeItem(next, itemId, 1)
  next.boost = {
    multiplier: fuel.multiplier,
    secondsRemaining: fuel.seconds,
    source: itemId,
  }
  return { state: next, error: null }
}

export type CrawlerFailure = 'no-core' | 'already-running'

/**
 * Wire the traction core in and wake the crawler up.
 *
 * Shaped like equipping deliberately: it consumes the part, it is explicit, and it is
 * the single moment the concurrency rule changes from one action at a time to two.
 */
export function installCrawler(
  state: GameState,
): { state: GameState; error: CrawlerFailure | null } {
  if (state.actors.crawler.unlocked) return { state, error: 'already-running' }
  if ((state.bank['crawler_core'] ?? 0) < 1) return { state, error: 'no-core' }

  const next = cloneState(state)
  removeItem(next, 'crawler_core', 1)
  next.actors.crawler.unlocked = true
  // It wakes where you are, not where it was parked in the save's defaults.
  next.actors.crawler.at = next.actors.mech.at
  return { state: next, error: null }
}

/** Send the crawler somewhere. It drives; it does not use your waypoints. */
export function moveCrawler(state: GameState, node: NodeId): GameState {
  if (!state.actors.crawler.unlocked) return state
  if (state.actors.crawler.at === node && !state.actors.crawler.travel) return state

  const next = cloneState(state)
  if (routeTo(next, 'crawler', [node]) === null) return state
  return next
}
