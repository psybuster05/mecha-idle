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
import { getCombatStyle, type CombatStyleId } from '../content/skills/combat'
import { nodesForAction, nodesForZone } from '../content/world'
import { canCrawlerRun, cloneState, haltActivity, markStorySeen, setActivity } from './state'
import { moveToAny, placeActor } from './world'
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
  if (!setActivity(next, actor, { kind: 'skill', skill, action })) return state
  if (actor === 'crawler') return next

  // Actions still happen somewhere - places gate content even though getting to them is
  // instant. If every node that does this job is still shut behind a boss, say so rather
  // than silently doing nothing.
  const where = nodesForAction(skill, action).map((n) => n.id)
  if (!moveToAny(next, actor, where)) {
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
  if (!moveToAny(next, actor, where)) {
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

/**
 * Choose which skill fights train.
 *
 * Allowed mid-fight on purpose: it changes nothing about the fight in progress, only
 * where the next kill's xp lands, so there is no reason to make the player disengage.
 */
export function setCombatStyle(state: GameState, style: CombatStyleId): GameState {
  if (state.combat.style === style) return state
  if (!getCombatStyle(style)) return state
  const next = cloneState(state)
  next.combat.style = style
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
export function installCrawler(state: GameState): {
  state: GameState
  error: CrawlerFailure | null
} {
  if (state.actors.crawler.unlocked) return { state, error: 'already-running' }
  if ((state.bank['crawler_core'] ?? 0) < 1) return { state, error: 'no-core' }

  const next = cloneState(state)
  removeItem(next, 'crawler_core', 1)
  next.actors.crawler.unlocked = true
  // It wakes where you are, not where it was parked in the save's defaults.
  next.actors.crawler.at = next.actors.mech.at
  return { state: next, error: null }
}

/**
 * Put an actor somewhere.
 *
 * Instant, and free. Since travel was removed this is no longer a cost to weigh, only a
 * statement of where you are - but it is still worth having explicitly, because places
 * are what the boss gates hang from and the map should show both bodies in the world.
 */
export function moveTo(state: GameState, node: NodeId, actor: ActorId = 'mech'): GameState {
  if (!state.actors[actor].unlocked) return state
  if (state.actors[actor].at === node) return state

  const next = cloneState(state)
  if (!placeActor(next, actor, node)) return state
  return next
}
