/**
 * Crediting time spent away.
 *
 * This is a single `tick` call, not a chunked loop, and that is a deliberate
 * simplification the tests earn: `tick` is proven to produce identical state whether
 * a span arrives as one large dt or thousands of small ones, for both skills and
 * combat. Since one call is exactly equivalent, chunking would only add moving parts.
 *
 * Combat is stepped event by event underneath, so twelve hours resolves in a few
 * milliseconds rather than by simulating 43,200 seconds one frame at a time.
 */

import { tick } from './tick'
import type { ActorId, GameState, ItemId, SkillId, StopReason } from './state'
import { ACTOR_IDS, ALL_SKILLS } from './state'

/**
 * Longest stretch that will ever be credited.
 *
 * At 24h a once-a-day player loses nothing to the cap, which suits a game meant to
 * sit on a second screen. It also means the ~503h to max a skill lands at about
 * three weeks for a daily player rather than six.
 */
export const MAX_OFFLINE_SECONDS = 24 * 3600
/** Below this, a return is a page refresh rather than an absence. Report nothing. */
export const MIN_OFFLINE_SECONDS = 60

export interface OfflineReport {
  /** Seconds actually simulated. */
  seconds: number
  /** Real seconds away, present only when the cap trimmed the span. */
  awaySeconds: number | null
  /** Xp gained per skill. Skills that gained nothing are omitted. */
  skillXp: Partial<Record<SkillId, number>>
  /** Net item change. Consumed inputs appear as negatives. */
  items: Partial<Record<ItemId, number>>
  /** Set when an activity halted while away, so the UI can explain the silence. */
  stopped: { actor: ActorId; reason: StopReason } | null
}

function itemDelta(before: GameState, after: GameState): Partial<Record<ItemId, number>> {
  const delta: Partial<Record<ItemId, number>> = {}
  const ids = new Set([...Object.keys(before.bank), ...Object.keys(after.bank)])
  for (const id of ids) {
    const change = (after.bank[id] ?? 0) - (before.bank[id] ?? 0)
    if (change !== 0) delta[id] = change
  }
  return delta
}

function firstStop(state: GameState): { actor: ActorId; reason: StopReason } | null {
  for (const actor of ACTOR_IDS) {
    const reason = state.actors[actor].stoppedReason
    if (reason) return { actor, reason }
  }
  return null
}

/**
 * Advance `state` by the wall-clock time since it was saved.
 *
 * Returns the original state and a null report when there is nothing worth showing -
 * a fresh game, a quick refresh, or a clock that has moved backwards.
 */
export function applyOffline(
  state: GameState,
  nowMs: number,
): { state: GameState; report: OfflineReport | null } {
  if (!state.savedAt || !Number.isFinite(nowMs)) return { state, report: null }

  const awaySeconds = (nowMs - state.savedAt) / 1000
  // A backwards clock (timezone change, manual adjustment) must never rewind or
  // credit anything. Ignore it and carry on.
  if (!(awaySeconds >= MIN_OFFLINE_SECONDS)) return { state, report: null }

  const seconds = Math.min(awaySeconds, MAX_OFFLINE_SECONDS)
  const after = tick(state, seconds)

  const skillXp: Partial<Record<SkillId, number>> = {}
  for (const skill of ALL_SKILLS) {
    const gained = after.skills[skill] - state.skills[skill]
    if (gained > 0) skillXp[skill] = gained
  }

  return {
    state: after,
    report: {
      seconds,
      awaySeconds: awaySeconds > MAX_OFFLINE_SECONDS ? awaySeconds : null,
      skillXp,
      items: itemDelta(state, after),
      stopped: firstStop(after),
    },
  }
}
