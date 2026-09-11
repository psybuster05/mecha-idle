import { TUTORIAL, type TutorialStage, type TutorialUnlock } from '../content/tutorial'
import type { GameState, GatheringSkillId } from './state'
import { GATHERING_SKILLS } from './state'
import { levelFromXp } from './xp'

/**
 * Which of the opening's stages are open.
 *
 * **Derived, never stored.** The same choice `waitingFor` makes: a stored flag is a
 * second copy of a fact that can fall out of step with the first, and deriving it from
 * levels means there is no new save field, no migration, and nothing for a save from an
 * older build to be missing. A save with two hundred hours on it simply has every stage
 * open the moment it loads.
 */

/**
 * The escape hatch, and it is load-bearing: **anything you have already done is open**,
 * requirement or not.
 *
 * Requirements chain through the skill that feeds each one, which is right for a new
 * game and wrong for every save that predates this. Someone could plausibly hold
 * Refining levels with Scavenging still at 1 - materials drop in combat too - and hiding
 * a skill somebody has trained would be taking progress away, which nothing in this game
 * is allowed to do.
 */
function alreadyStarted(state: GameState, what: TutorialUnlock): boolean {
  return state.skills[what] > 0
}

export function isUnlocked(state: GameState, what: TutorialUnlock): boolean {
  const stage = TUTORIAL.find((s) => s.unlocks === what)
  // Nothing in the table is open by default: a skill this does not know about is not
  // something to guess at, and every gathering skill is listed.
  if (!stage) return true
  if (!stage.requires) return true
  if (alreadyStarted(state, what)) return true
  return levelFromXp(state.skills[stage.requires.skill]) >= stage.requires.level
}

export function isSkillUnlocked(state: GameState, skill: GatheringSkillId): boolean {
  return isUnlocked(state, skill)
}

/** The gathering skills that currently have a panel, in rail order. */
export function unlockedSkills(state: GameState): GatheringSkillId[] {
  return GATHERING_SKILLS.filter((id) => isUnlocked(state, id))
}

/**
 * The one locked stage worth showing, or null once they are all open.
 *
 * One step of frontier and no further - the same rule the map keeps, where `visibleNodes`
 * draws everywhere you can reach plus the places one step beyond it. Showing the whole
 * remaining chain would be a roadmap; showing none of it would leave a player who has
 * only ever seen one skill with no reason to believe there are others.
 */
export function nextStage(state: GameState): TutorialStage | null {
  return TUTORIAL.find((stage) => !isUnlocked(state, stage.unlocks)) ?? null
}

/** Everything currently open. Used by the view to notice when that set grows. */
export function unlockedStages(state: GameState): TutorialUnlock[] {
  return TUTORIAL.filter((stage) => isUnlocked(state, stage.unlocks)).map((s) => s.unlocks)
}
