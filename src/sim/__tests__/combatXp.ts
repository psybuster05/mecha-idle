import { STYLE_SHARE } from '../../content/skills/combat'
import { COMBAT_SKILLS, type GameState } from '../state'
import { xpForLevel } from '../xp'

/**
 * A branch-neutral count of how much has been killed.
 *
 * Tests used to read `skills.attack` as a stand-in for kills, which worked while every
 * fight paid Attack directly. It stopped working the moment weapons had branches: a
 * ranged weapon pays Ranged, so Attack sits at zero and every weapon comparison reads as
 * "killed nothing".
 *
 * Summing the routed skills is immune to that, and to the attack style as well, because
 * a kill always pays exactly `STYLE_SHARE * enemy.xp` across them however it is split.
 * Hitpoints is excluded: it is rounded per kill, so it makes a lossy divisor.
 */
const ROUTED = COMBAT_SKILLS.filter((skill) => skill !== 'hitpoints')

export function combatXp(state: GameState): number {
  return ROUTED.reduce((total, skill) => total + state.skills[skill], 0)
}

/** Combat xp earned since every combat skill stood at `fromLevel`. */
export function combatXpSince(state: GameState, fromLevel: number): number {
  return combatXp(state) - ROUTED.length * xpForLevel(fromLevel)
}

/**
 * Kills landed since every combat skill stood at `fromLevel`.
 *
 * Pass `xpBonus` when the state carries perks that multiply xp, or the count comes back
 * inflated by exactly that bonus.
 */
export function killsSince(
  state: GameState,
  fromLevel: number,
  enemyXp: number,
  xpBonus = 0,
): number {
  return combatXpSince(state, fromLevel) / (STYLE_SHARE * enemyXp * (1 + xpBonus))
}
