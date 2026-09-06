import type { DamageType, Resistances } from '../sim/state'
import type { DropChance, ItemStack } from './types'

/**
 * A stage a boss moves through as its HP falls.
 *
 * Phases exist to make *preparation* the gameplay. In an auto-battler you never dodge
 * or time anything, so a boss made only of large numbers resolves exactly like a trash
 * fight. A phase that inverts which damage type works forces you to have brought an
 * answer - and that decision happens before the fight, which is the part you control.
 */
export interface BossPhase {
  /** Entered when the boss drops to or below this fraction of max HP. */
  below: number
  name: string
  /** Shown when the phase begins. */
  message: string
  /** Replaces the base resistances entirely while this phase is active. */
  resistances?: Resistances
  /** Scales the boss's outgoing damage. */
  damageMultiplier?: number
  /** Scales the boss's attack interval. Below 1 means it swings faster. */
  attackIntervalMultiplier?: number
  /** Changes what the boss deals. */
  damageType?: DamageType
}

/**
 * A permanent reward for beating a boss, active forever afterwards.
 *
 * This is how combat pays a player who mostly idles: it widens what you can do without
 * ever standing between them and a level. See the gating rule in CLAUDE.md.
 */
export interface BossPerk {
  id: string
  name: string
  description: string
  /** Chance per gathering completion of a bonus haul. 0.08 = 8%. */
  gatheringYield?: number
  /** Flat map units per second added to travel. */
  moveSpeed?: number
  /** Fractional bonus to all xp earned. 0.05 = +5%. */
  xpBonus?: number
}

export interface EnemyDef {
  id: string
  name: string
  description: string
  maxHp: number
  accuracy: number
  /** Opposed against attacker accuracy to decide whether a swing lands. */
  evasion: number
  damage: number
  armour: number
  /** Seconds between the enemy's swings. */
  attackInterval: number
  /** What this enemy's attacks deal. */
  damageType: DamageType
  /** Incoming multipliers by type. Anything omitted is neutral. */
  resistances?: Resistances
  /**
   * Xp per kill. Granted in full to Attack, Strength and Defence; Hitpoints gets
   * 40%, so survivability trails offence slightly and stays worth investing in.
   */
  xp: number
  /** Always dropped on a kill. */
  guaranteed?: ItemStack[]
  /** Rolled independently on a kill. */
  drops?: DropChance[]
  /** Present on bosses. Ordered highest threshold first. */
  phases?: BossPhase[]
  /** Bosses are chosen deliberately and never appear in a random spawn. */
  isBoss?: boolean
  /** Granted permanently the first time this boss falls. */
  perk?: BossPerk
}

export const ENEMIES: readonly EnemyDef[] = [
  {
    id: 'scrap_crawler',
    name: 'Scrap Crawler',
    description: 'A cleaning unit that never received a stop order. It has been tidying for decades.',
    maxHp: 20,
    accuracy: 8,
    evasion: 6,
    damage: 3,
    armour: 0,
    attackInterval: 3.2,
    damageType: 'kinetic',
    // Exposed wiring, no shielding worth the name.
    resistances: { emp: 1.4 },
    xp: 6,
    guaranteed: [{ item: 'scrap_steel', qty: 2 }],
    drops: [{ item: 'copper_wiring', qty: 1, chance: 0.25 }],
  },
  {
    id: 'sentry_drone',
    name: 'Derelict Sentry Drone',
    description: 'Still broadcasting a challenge code. Nothing has answered it in a very long time.',
    maxHp: 45,
    accuracy: 14,
    evasion: 12,
    damage: 6,
    armour: 1,
    attackInterval: 2.8,
    damageType: 'energy',
    // Flight means thin plating, and it is all sensors and avionics inside.
    resistances: { kinetic: 1.2, emp: 1.6, energy: 0.8 },
    xp: 15,
    guaranteed: [{ item: 'scrap_steel', qty: 3 }],
    drops: [
      { item: 'copper_wiring', qty: 2, chance: 0.4 },
      { item: 'intact_servo', qty: 1, chance: 0.06 },
    ],
  },
  {
    id: 'reclaimer',
    name: 'Reclaimer Unit',
    description: 'Built to strip derelicts for parts. It does not distinguish between derelict and you.',
    maxHp: 90,
    accuracy: 22,
    evasion: 18,
    damage: 11,
    armour: 3,
    attackInterval: 2.5,
    damageType: 'kinetic',
    // Industrial plate: shrugs off impacts, but heat gets through and it is shielded.
    resistances: { kinetic: 0.7, energy: 1.3, emp: 0.7 },
    xp: 34,
    guaranteed: [
      { item: 'scrap_steel', qty: 4 },
      { item: 'titanium_shard', qty: 1 },
    ],
    drops: [
      { item: 'intact_servo', qty: 1, chance: 0.15 },
      { item: 'power_cell', qty: 1, chance: 0.1 },
    ],
  },

  // --- Bosses --------------------------------------------------------------
  {
    id: 'overseer',
    name: 'The Overseer',
    description:
      'The unit that ran this district. It has kept the schedule for thirty years with nobody left to keep it for.',
    maxHp: 900,
    accuracy: 40,
    evasion: 26,
    damage: 18,
    armour: 6,
    attackInterval: 2.6,
    damageType: 'kinetic',
    // Opens honest: whatever you brought, it works.
    resistances: { kinetic: 1, energy: 1, emp: 1 },
    xp: 900,
    isBoss: true,
    perk: {
      id: 'district_override',
      name: 'District Override',
      description:
        'Its authority codes are yours now. The district answers when you ask, and it is quicker to cross.',
      gatheringYield: 0.08,
      moveSpeed: 10,
    },
    guaranteed: [
      { item: 'titanium_shard', qty: 12 },
      { item: 'fused_core', qty: 1 },
    ],
    drops: [
      { item: 'optic_lens', qty: 2, chance: 0.6 },
      { item: 'sealed_bearing', qty: 3, chance: 0.5 },
    ],
    phases: [
      {
        below: 0.6,
        name: 'Bulwark',
        message: 'Ablative plating slams down. Impacts stop mattering.',
        // Kinetic answers dry up; the exposed conduits underneath do not like EMP.
        resistances: { kinetic: 0.25, energy: 0.9, emp: 1.5 },
        attackIntervalMultiplier: 0.85,
      },
      {
        below: 0.25,
        name: 'Overload',
        message: 'The plating blows off in sheets. It stops defending and starts burning.',
        // Sheds armour for speed and switches to energy. Survive it and you win.
        resistances: { kinetic: 1.3, energy: 1.2, emp: 0.5 },
        damageType: 'energy',
        damageMultiplier: 1.9,
        attackIntervalMultiplier: 0.6,
      },
    ],
  },
] as const

const byId = new Map(ENEMIES.map((e) => [e.id, e]))

export function getEnemy(id: string): EnemyDef | undefined {
  return byId.get(id)
}

/**
 * Which phase a boss is in, derived from its current HP.
 *
 * Derived rather than stored, so no save migration is needed and the phase can never
 * drift out of sync with the health bar it is supposed to describe.
 */
export function activePhase(enemy: EnemyDef, hp: number): BossPhase | null {
  if (!enemy.phases?.length || enemy.maxHp <= 0) return null
  const fraction = hp / enemy.maxHp
  let current: BossPhase | null = null
  for (const phase of enemy.phases) {
    if (fraction <= phase.below) current = phase
  }
  return current
}

/** An enemy's resistances right now, accounting for the phase it is in. */
export function effectiveResistances(enemy: EnemyDef, hp: number): Resistances {
  return activePhase(enemy, hp)?.resistances ?? enemy.resistances ?? {}
}

/** Every perk currently earned, from the bosses recorded as defeated. */
export function earnedPerks(defeated: Partial<Record<string, number>>): BossPerk[] {
  return ENEMIES.filter((e) => e.perk && (defeated[e.id] ?? 0) > 0).map((e) => e.perk!)
}

/** Sum of one numeric perk field across everything earned. */
export function perkTotal(
  defeated: Partial<Record<string, number>>,
  field: 'gatheringYield' | 'moveSpeed' | 'xpBonus',
): number {
  return earnedPerks(defeated).reduce((sum, perk) => sum + (perk[field] ?? 0), 0)
}
