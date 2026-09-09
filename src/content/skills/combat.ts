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
    id: 'ranged',
    name: 'Ranged',
    description:
      'Standoff gunnery. One discipline doing the work of two - where to put it, and how hard it arrives.',
    grants: [
      { stat: 'Accuracy', perLevel: 2 },
      { stat: 'Damage', perLevel: 1.2 },
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
  /**
   * Which skill takes the whole share, per branch. Null means split across that
   * branch's set. Two entries because the same style means different things depending
   * on what you are holding: Aggressive trains Strength with a lance and Ranged with a
   * launcher, since Ranged is one skill doing both jobs.
   */
  trains: Record<CombatClass, CombatSkillId | null>
  /**
   * Multipliers on derived stats. Absent means unchanged.
   *
   * Multipliers, not flat bonuses, for the reason already learned on weapons: a flat
   * bonus is swamped by level scaling. +3 accuracy is a lot at level 1 and nothing at
   * 99, so a style would stop being a choice exactly when choices should matter.
   */
  effects?: { accuracy?: number; damage?: number; evasion?: number; armour?: number }
}

export type CombatClass = 'melee' | 'ranged'

/**
 * The skills each branch routes xp between. Hitpoints is deliberately in neither - it
 * always earns its own share, whatever you are holding.
 *
 * The sets are different sizes, and that is fine: the *total* is what is held constant,
 * not the per-skill amount. See `styleShare`.
 */
export const BRANCH_SKILLS: Record<CombatClass, readonly CombatSkillId[]> = {
  melee: ['attack', 'strength', 'defence'],
  ranged: ['ranged', 'defence'],
}

/**
 * Total combat xp a kill pays, as a multiple of the enemy's xp value.
 *
 * Fixed at 3 because that is what melee paid before styles existed - full xp to Attack,
 * Strength and Defence at once. Every style and every branch pays exactly this, so no
 * choice is faster than another and zone gating never moves as a side effect.
 */
export const STYLE_SHARE = 3

/** How a kill's xp divides, given a branch and a style. */
export function styleShare(
  style: CombatStyleDef,
  branch: CombatClass,
  xp: number,
): { skill: CombatSkillId; amount: number }[] {
  const focus = style.trains[branch]
  if (focus) return [{ skill: focus, amount: xp * STYLE_SHARE }]
  const set = BRANCH_SKILLS[branch]
  return set.map((skill) => ({ skill, amount: (xp * STYLE_SHARE) / set.length }))
}

export const COMBAT_STYLES: readonly CombatStyleDef[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    trains: { melee: null, ranged: null },
    // No combat bonus, on purpose. Balanced buys *breadth*: spread xp keeps all three
    // skills climbing, and combat level is their average, which is what gates zones.
    // Focused styles buy depth instead. Giving Balanced a consolation multiplier as
    // well would have made it the safe default rather than a real choice - and it
    // would have quietly shifted every balance number already measured, since this is
    // the style every existing save is on.
  },
  {
    id: 'accurate',
    name: 'Accurate',
    trains: { melee: 'attack', ranged: 'ranged' },
    effects: { accuracy: 1.12 },
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    trains: { melee: 'strength', ranged: 'ranged' },
    effects: { damage: 1.12 },
  },
  {
    id: 'defensive',
    name: 'Defensive',
    trains: { melee: 'defence', ranged: 'defence' },
    effects: { evasion: 1.12, armour: 1.12 },
  },
]

export function getCombatStyle(id: string): CombatStyleDef | undefined {
  return COMBAT_STYLES.find((style) => style.id === id)
}
