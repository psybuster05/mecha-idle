import type { GatheringSkillId } from '../sim/state'

/**
 * The opening: one subroutine at a time.
 *
 * A fresh mech used to wake up with all four non-combat skills on the rail and no reason
 * to touch any particular one. That is a menu, not a beginning - and it wasted the one
 * piece of fiction this game has that no other idle game does, which is that skills are
 * **recovered** rather than learned. Every part you install is your own body; every skill
 * you get back is your own memory.
 *
 * So each one is gated behind the skill that *feeds* it. You scavenge until you have
 * enough of a furnace to remember refining; you refine until you can remember what to
 * build; you build until you remember how to take things apart. The dependency chain
 * teaches itself, in the order the bank already implies.
 *
 * Two rules this has to keep, and they are the story rules from the other side:
 *
 * - **Triggers are monotonic.** A level, never a bank count. Once true, true forever -
 *   otherwise spending the last of an item could take a skill back off you, and a single
 *   large offline step could miss a condition that many small ones caught.
 * - **Nothing here gates combat, and combat gates nothing here.** The whole ladder is
 *   reachable by a player who never fights, which is the same contract every other lock
 *   in this game keeps.
 */

/**
 * What a stage hands back: a non-combat skill.
 *
 * It used to end with the crawler as a fifth stage. The crawler was cut - see the stage
 * list below for what the opening is now.
 */
export type TutorialUnlock = GatheringSkillId

export interface TutorialStage {
  unlocks: TutorialUnlock
  /** What it is called while it is still locked, before its own panel exists. */
  name: string
  /** Null for the one you wake up with. */
  requires: { skill: GatheringSkillId; level: number } | null
  /** Shown on the locked row. What to do, not what you will get. */
  hint: string
  /** Said once, when it opens. */
  recovered: string
}

/**
 * In order. Each stage's requirement names the stage before it, so the chain is walkable
 * from a standing start - asserted rather than assumed.
 */
export const TUTORIAL: readonly TutorialStage[] = [
  {
    unlocks: 'scavenging',
    name: 'Scavenging',
    requires: null,
    hint: '',
    recovered: '',
  },
  {
    unlocks: 'refining',
    name: 'Refining',
    requires: { skill: 'scavenging', level: 5 },
    hint: 'Scavenging 5',
    recovered: 'Refining recovered. You remember what a furnace was for.',
  },
  {
    unlocks: 'fabrication',
    name: 'Fabrication',
    requires: { skill: 'refining', level: 5 },
    hint: 'Refining 5',
    recovered: 'Fabrication recovered. You can make things now, not only melt them.',
  },
  {
    unlocks: 'salvaging',
    name: 'Salvaging',
    requires: { skill: 'fabrication', level: 5 },
    hint: 'Fabrication 5',
    recovered: 'Salvaging recovered. Everything you build comes apart again.',
  },
]

export function getStage(unlocks: TutorialUnlock): TutorialStage | undefined {
  return TUTORIAL.find((stage) => stage.unlocks === unlocks)
}
