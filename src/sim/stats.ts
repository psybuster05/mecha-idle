/**
 * Derived combat stats.
 *
 * Nothing here is stored in state - stats are always recomputed from skill xp plus
 * equipped parts. That means a balance change to an item takes effect immediately
 * for existing saves, with no migration.
 */

import { getItem } from '../content'
import { perkTotal } from '../content/enemies'
import type { EquipStats } from '../content/types'
import {
  DAMAGE_TYPES,
  DEFAULT_DAMAGE_TYPE,
  EQUIP_SLOTS,
  type DamageType,
  type GameState,
  type Resistances,
} from './state'
import { levelFromXp } from './xp'

/** Seconds between our swings with no reactor fitted. */
export const BASE_ATTACK_INTERVAL = 3
/** However much attack speed is stacked, swings never get faster than this. */
export const MIN_ATTACK_INTERVAL = 1.2
/**
 * Fraction of maximum HP restored every second, always.
 *
 * Without this, any fight longer than (maxHP / incoming DPS) is unwinnable no matter
 * how much damage you deal - and boss fights are exactly that, because the heal-on-kill
 * never fires during one. At level 99 that put a hard ceiling of about 140 seconds on
 * any single fight, which made an 11,000 HP boss impossible for every build.
 *
 * Deliberately small: it should sustain you through a long grind and a boss's quiet
 * phases, never out-heal a phase that is actively trying to kill you.
 */
export const HP_REGEN_PER_SECOND = 0.004

/**
 * Fraction of maximum HP restored when a boss changes phase.
 *
 * Without it a long boss fight is unwinnable by arithmetic rather than by difficulty.
 * Regeneration is 0.4%/s and max HP tops out near 1,100, so a 400-second fight lets a
 * boss deal about 2.6 net damage per second - absurd for a finale. Healing on each
 * transition turns one long fight into several short ones, which is the shape the HP
 * budget can actually support, and it reads as the boss stepping back to reconfigure.
 */
export const PHASE_TRANSITION_HEAL = 0.35

/** Fraction of maximum HP restored on each kill. */
export const HEAL_ON_KILL = 0.08
/** Map units walked per second with nothing fitted. */
export const BASE_MOVE_SPEED = 30
/** Seconds between one enemy dying and the next arriving. */
export const RESPAWN_DELAY = 2

export interface DerivedStats {
  maxHp: number
  accuracy: number
  evasion: number
  damage: number
  armour: number
  attackInterval: number
  /** Map units per second. Better legs raise this. */
  moveSpeed: number
  /** Fraction of overkill carried to the next enemy, 0..1. */
  cleave: number
  /** Fraction of enemy armour ignored, 0..1. */
  armourPierce: number
  /** Multiplier on non-combat action duration. Below 1 means faster. */
  skillDurationScale: number
  /** What our attacks deal, from the fitted weapon. */
  damageType: DamageType
  /** Incoming multipliers by type, from fitted armour. */
  resistances: Required<Resistances>
}

/**
 * The additive, numeric equipment stats. Excludes damageType and resist, which are
 * not summed - one is picked from the weapon, the other multiplies.
 */
type NumericEquipStat = {
  [K in keyof EquipStats]-?: NonNullable<EquipStats[K]> extends number ? K : never
}[keyof EquipStats]

/** Product of one multiplier stat across everything equipped. Absent means 1. */
function equippedProduct(state: GameState, stat: 'damageMultiplier'): number {
  let total = 1
  for (const slot of EQUIP_SLOTS) {
    const itemId = state.equipment[slot]
    if (!itemId) continue
    total *= getItem(itemId)?.stats?.[stat] ?? 1
  }
  return total
}

/** Sum of one stat across everything currently equipped. */
function equippedTotal(state: GameState, stat: NumericEquipStat): number {
  let total = 0
  for (const slot of EQUIP_SLOTS) {
    const itemId = state.equipment[slot]
    if (!itemId) continue
    total += getItem(itemId)?.stats?.[stat] ?? 0
  }
  return total
}

/** The fitted weapon decides what we deal. Bare-handed is kinetic. */
function equippedDamageType(state: GameState): DamageType {
  const weapon = state.equipment.weapon
  return (weapon && getItem(weapon)?.stats?.damageType) || DEFAULT_DAMAGE_TYPE
}

/**
 * Resistances stack multiplicatively, so two 0.8 pieces give 0.64 rather than 0.6.
 * Additive stacking would let a handful of parts reach total immunity.
 */
function equippedResistances(state: GameState): Required<Resistances> {
  const total: Required<Resistances> = { kinetic: 1, energy: 1, emp: 1 }
  for (const slot of EQUIP_SLOTS) {
    const itemId = state.equipment[slot]
    if (!itemId) continue
    const resist = getItem(itemId)?.stats?.resist
    if (!resist) continue
    for (const type of DAMAGE_TYPES) total[type] *= resist[type] ?? 1
  }
  return total
}

export function derivedStats(state: GameState): DerivedStats {
  const attack = levelFromXp(state.skills.attack)
  const strength = levelFromXp(state.skills.strength)
  const defence = levelFromXp(state.skills.defence)
  const hitpoints = levelFromXp(state.skills.hitpoints)

  return {
    maxHp: 50 + hitpoints * 8 + equippedTotal(state, 'hp'),
    accuracy: 10 + attack * 2 + equippedTotal(state, 'accuracy'),
    // Evasion rides on Defence too: heavier armour makes you harder to meaningfully hit.
    evasion: 8 + defence * 1.5 + equippedTotal(state, 'evasion'),
    damage:
      (3 + strength * 1.2 + equippedTotal(state, 'damage')) *
      equippedProduct(state, 'damageMultiplier') *
      (1 + perkTotal(state.defeated, 'damageBonus')),
    armour: defence * 0.8 + equippedTotal(state, 'armour'),
    attackInterval: Math.max(
      MIN_ATTACK_INTERVAL,
      BASE_ATTACK_INTERVAL - equippedTotal(state, 'attackSpeed'),
    ),
    moveSpeed:
      BASE_MOVE_SPEED + equippedTotal(state, 'moveSpeed') + perkTotal(state.defeated, 'moveSpeed'),
    // Expressed as a duration multiplier rather than a speed bonus so stacking is
    // sane: +25% and +25% gives 1/1.5, not a free ride to zero.
    cleave: Math.min(1, Math.max(0, equippedTotal(state, 'cleave'))),
    armourPierce: Math.min(0.9, Math.max(0, equippedTotal(state, 'armourPierce'))),
    // Fuel multiplies on top of equipment, so a good build and a burning cell compound.
    skillDurationScale:
      1 /
      ((1 + Math.max(0, equippedTotal(state, 'skillSpeed'))) *
        (state.boost && state.boost.secondsRemaining > 0 ? state.boost.multiplier : 1)),
    damageType: equippedDamageType(state),
    resistances: equippedResistances(state),
  }
}

/** Mean of the four combat skill levels. Gates zone entry. */
export function combatLevel(state: GameState): number {
  const levels = [
    levelFromXp(state.skills.attack),
    levelFromXp(state.skills.strength),
    levelFromXp(state.skills.defence),
    levelFromXp(state.skills.hitpoints),
  ]
  return Math.floor(levels.reduce((a, b) => a + b, 0) / levels.length)
}
