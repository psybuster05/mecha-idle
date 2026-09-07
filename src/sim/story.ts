/**
 * Evaluating story triggers.
 *
 * Runs inside `tick`, so beats fire while you are away and are waiting when you come
 * back. Pure, like everything else here - it only ever moves ids into `story.pending`,
 * and the UI decides when something counts as read.
 */

import { STORY_BEATS, type StoryTrigger } from '../content/story'
import { hasDefeated, queueStoryBeat, type GameState } from './state'
import { levelFromXp } from './xp'

/**
 * Whether a trigger has fired.
 *
 * Every case here must be **monotonic** - once true, true forever. `tick` checks these
 * once per step, so a condition that can flip back could be missed entirely by one
 * large offline step while many small steps caught it. That is why visits are read
 * from `state.visited` rather than from where the mech happens to be standing.
 */
function fired(state: GameState, when: StoryTrigger): boolean {
  switch (when.kind) {
    case 'gameStart':
      return true
    case 'defeat':
      return hasDefeated(state, when.boss)
    case 'visit':
      return state.visited.includes(when.node)
    case 'skillLevel':
      return levelFromXp(state.skills[when.skill]) >= when.level
    case 'allDefeated':
      return when.bosses.every((boss) => hasDefeated(state, boss))
  }
}

/**
 * Mutates. Queues every beat whose trigger has fired and which has not been queued or
 * read already. Returns how many were added.
 */
export function advanceStory(state: GameState): number {
  let queued = 0
  for (const beat of STORY_BEATS) {
    if (!fired(state, beat.when)) continue
    if (queueStoryBeat(state, beat.id)) queued++
  }
  return queued
}

/** Beats waiting to be read, in the order they fired. */
export function pendingBeats(state: GameState): string[] {
  return state.story.pending
}

/** The first unread beat that should stop what the player is doing, if any. */
export function nextInterrupt(state: GameState): string | null {
  for (const id of state.story.pending) {
    if (STORY_BEATS.find((beat) => beat.id === id)?.kind === 'interrupt') return id
  }
  return null
}

/** Unread beats that land quietly. Drives the badge on the Log. */
export function unreadLogCount(state: GameState): number {
  return state.story.pending.filter(
    (id) => STORY_BEATS.find((beat) => beat.id === id)?.kind === 'log',
  ).length
}
