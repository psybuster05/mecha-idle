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
