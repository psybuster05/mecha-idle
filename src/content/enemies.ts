import type { DropChance, ItemStack } from './types'

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
  /**
   * Xp per kill. Granted in full to Targeting, Servos and Plating; Structure gets
   * 40%, so survivability trails offence slightly and stays worth investing in.
   */
  xp: number
  /** Always dropped on a kill. */
  guaranteed?: ItemStack[]
  /** Rolled independently on a kill. */
  drops?: DropChance[]
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
] as const

const byId = new Map(ENEMIES.map((e) => [e.id, e]))

export function getEnemy(id: string): EnemyDef | undefined {
  return byId.get(id)
}
