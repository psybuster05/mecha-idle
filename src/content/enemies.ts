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

  // --- Ship Graveyard ------------------------------------------------------
  //
  // Everything down here was built to sit in salt water, so it is uniformly hard to
  // disrupt electrically. EMP - the answer to the Rustbelt - is the *wrong* tool
  // here, which is the point: each region should retire the last one's easy answer.
  {
    id: 'scuttler',
    name: 'Scuttler',
    description: 'A hull-cleaning drone that decided the hulls were better off stripped.',
    maxHp: 60,
    accuracy: 26,
    evasion: 24,
    damage: 9,
    armour: 1,
    attackInterval: 2.2,
    damageType: 'kinetic',
    resistances: { emp: 0.6, kinetic: 1.2, energy: 1 },
    xp: 40,
    guaranteed: [{ item: 'hull_plate', qty: 2 }],
    drops: [{ item: 'scrap_steel', qty: 4, chance: 0.5 }],
  },
  {
    id: 'deck_gunner',
    name: 'Deck Gunner',
    description: 'Point defence that never received a stand-down order, welded to a rail it can still traverse.',
    maxHp: 110,
    accuracy: 34,
    evasion: 20,
    damage: 16,
    armour: 4,
    attackInterval: 2.4,
    damageType: 'energy',
    resistances: { emp: 0.7, energy: 0.7, kinetic: 1.15 },
    xp: 70,
    guaranteed: [{ item: 'hull_plate', qty: 3 }],
    drops: [
      { item: 'sonar_array', qty: 1, chance: 0.12 },
      { item: 'copper_wiring', qty: 4, chance: 0.4 },
    ],
  },
  {
    id: 'boarding_rig',
    name: 'Boarding Rig',
    description: 'Cargo-handling gear repurposed for taking things off ships that objected.',
    maxHp: 220,
    accuracy: 44,
    evasion: 16,
    damage: 27,
    armour: 9,
    attackInterval: 3,
    damageType: 'kinetic',
    resistances: { emp: 0.65, kinetic: 0.7, energy: 1.25 },
    xp: 130,
    guaranteed: [
      { item: 'hull_plate', qty: 4 },
      { item: 'hydraulic_ram', qty: 1 },
    ],
    drops: [{ item: 'sonar_array', qty: 1, chance: 0.25 }],
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
  {
    id: 'quartermaster',
    name: 'The Quartermaster',
    description:
      'It kept the manifest. When the crew stopped coming back it went on keeping it, and started adding to it by force.',
    maxHp: 2600,
    accuracy: 78,
    evasion: 40,
    damage: 34,
    armour: 14,
    attackInterval: 2.4,
    damageType: 'emp',
    // Sealed and drenched: EMP barely registers. Whatever beat the Overseer will not
    // work twice.
    resistances: { kinetic: 1, energy: 1.1, emp: 0.35 },
    xp: 3200,
    isBoss: true,
    perk: {
      id: 'salvage_rights',
      name: 'Salvage Rights',
      description:
        'The manifest is yours. You know what is worth taking before you open it, and what it was worth to whoever wrote it down.',
      xpBonus: 0.06,
      gatheringYield: 0.05,
    },
    guaranteed: [
      { item: 'pressure_hull', qty: 1 },
      { item: 'hydraulic_ram', qty: 6 },
      { item: 'hull_plate', qty: 20 },
    ],
    drops: [
      { item: 'sonar_array', qty: 3, chance: 0.7 },
      { item: 'pressure_hull', qty: 1, chance: 0.25 },
    ],
    phases: [
      {
        below: 0.55,
        name: 'Ballast',
        message: 'It floods its own compartments. Heat goes into the water and stops mattering.',
        // Energy dies here, so the opening answer has to be abandoned mid-fight.
        resistances: { kinetic: 1.3, energy: 0.35, emp: 0.4 },
        attackIntervalMultiplier: 0.9,
      },
      {
        below: 0.2,
        name: 'Scuttle',
        message: 'It blows the seals and vents everything at once. Nothing left to protect.',
        resistances: { kinetic: 1.25, energy: 1.25, emp: 1.1 },
        damageType: 'kinetic',
        damageMultiplier: 2.1,
        attackIntervalMultiplier: 0.55,
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
