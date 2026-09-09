import type { GameState, GatheringSkillId } from '../state'

/**
 * Open a skill for a fixture without walking the opening.
 *
 * The game gates the non-combat skills behind each other now, so a test that starts
 * Refining on a fresh game gets nothing at all - correctly, and silently, which is the
 * worst way to find out.
 *
 * This uses the same escape hatch the game itself uses: a skill you have already touched
 * stays open whatever the requirement says. One xp costs no level, no rate and no yield
 * chance. Granting the *feeder* skill its requirement level instead would quietly change
 * the bonus-haul odds some of these tests are measuring.
 */
export function opened(state: GameState, ...skills: GatheringSkillId[]): GameState {
  for (const skill of skills) state.skills[skill] = Math.max(state.skills[skill], 1)
  return state
}
