import type { CombatSkillId } from '../../sim/state'

/**
 * The four combat skills, as data.
 *
 * These have always existed in the simulation - every fight pays xp into all four - but
 * until Combat became its own section there was nowhere to *see* them. You could gain
 * levels in Attack for hours and never learn the skill had a level. That is the gap this
 * table fills.
 *
 * `perLevel` is the coefficient the same skill uses in `derivedStats`, kept here so the
 * panel can say what a level buys without doing arithmetic of its own. If a coefficient
 * changes in `sim/stats.ts`, it must change here too - a test asserts they agree, because
 * a lying tooltip is worse than no tooltip.
 */
export interface CombatSkillDef {
  id: CombatSkillId
  name: string
  description: string
  /** What each level adds, and to which readable stat. */
  grants: readonly { stat: string; perLevel: number }[]
}

export const COMBAT_SKILL_DEFS: readonly CombatSkillDef[] = [
  {
    id: 'attack',
    name: 'Attack',
    description:
      'Targeting solutions, recovered piece by piece. The first few fights you were mostly guessing.',
    grants: [{ stat: 'Accuracy', perLevel: 2 }],
  },
  {
    id: 'strength',
    name: 'Strength',
    description:
      'How hard you commit to a hit. Restraint was a setting once, and nothing has needed it since.',
    grants: [{ stat: 'Damage', perLevel: 1.2 }],
  },
  {
    id: 'defence',
    name: 'Defence',
    description:
      'Reading a swing early enough to be somewhere else, and being built to survive the ones you misread.',
    grants: [
      { stat: 'Evasion', perLevel: 1.5 },
      { stat: 'Armour', perLevel: 0.8 },
    ],
  },
  {
    id: 'hitpoints',
    name: 'Hitpoints',
    description:
      'Structural tolerance. It goes up because you keep finding out where the limit was.',
    grants: [{ stat: 'Max HP', perLevel: 8 }],
  },
]

export function getCombatSkill(id: string): CombatSkillDef | undefined {
  return COMBAT_SKILL_DEFS.find((skill) => skill.id === id)
}

/**
 * Attack styles - which skill a fight trains.
 *
 * **Every style pays the same total xp.** That is the load-bearing rule here. Before
 * styles existed, a kill gave the full xp to Attack, Strength *and* Defence at once; a
 * style that routed that to a single skill would have cut combat training to a third and
 * quietly re-gated every zone, since zone requirements read combat level.
 *
 * So a focused style hands one skill what the three would have shared, and Balanced is
 * the old behaviour kept as an option and as the default. Nothing gets faster or slower
 * overall - you are choosing *where* it lands.
 *
 * That choice still costs something, and it should. Combat level is the average of the
 * four skills and the xp curve is exponential, so triple xp in one skill buys fewer total
 * levels than the same xp spread over three. Specialising makes one number climb fast and
 * your combat level climb slower. That is the trade, and it is measured in the tests
 * rather than assumed.
 *
 * Hitpoints is outside all of this: it always earns its share, whatever you pick, because
 * everything hitting you trains it.
 */
export type CombatStyleId = 'balanced' | 'accurate' | 'aggressive' | 'defensive'

export interface CombatStyleDef {
  id: CombatStyleId
  name: string
  description: string
  /** Which skill takes the whole share. Null means split it, as it always was. */
  trains: CombatSkillId | null
}

/** The skills a style routes between. Hitpoints is deliberately not one of them. */
export const STYLE_SKILLS: readonly CombatSkillId[] = ['attack', 'strength', 'defence']

export const COMBAT_STYLES: readonly CombatStyleDef[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Split evenly. Nothing improves quickly and nothing is neglected.',
    trains: null,
  },
  {
    id: 'accurate',
    name: 'Accurate',
    description: 'Take the shot you are sure of. Everything into Attack.',
    trains: 'attack',
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Commit to every hit and let the plating take what it takes. Everything into Strength.',
    trains: 'strength',
  },
  {
    id: 'defensive',
    name: 'Defensive',
    description: 'Fight to still be standing afterwards. Everything into Defence.',
    trains: 'defence',
  },
]

export function getCombatStyle(id: string): CombatStyleDef | undefined {
  return COMBAT_STYLES.find((style) => style.id === id)
}
