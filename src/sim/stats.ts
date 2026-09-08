/**
 * Derived combat stats.
 *
 * Nothing here is stored in state - stats are always recomputed from skill xp plus
 * equipped parts. That means a balance change to an item takes effect immediately
 * for existing saves, with no migration.
 */

import { getItem } from '../content'
import { effectiveSpeed } from './fuel'
import { perkTotal } from '../content/enemies'
import { getCombatStyle, type CombatClass } from '../content/skills/combat'
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
/** Seconds between one enemy dying and the next arriving. */
export const RESPAWN_DELAY = 2

export interface DerivedStats {
  maxHp: number
  accuracy: number
  evasion: number
  damage: number
  armour: number
  attackInterval: number
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

/**
 * Which branch the equipped weapon fights with.
 *
 * Bare-handed counts as melee, and so does a weapon that forgot to say - the branch that
 * cannot borrow Ranged levels is the safe default for a content mistake. 'any' follows
 * whichever branch you have trained higher, so the endgame weapon never punishes the
 * ladder you chose.
 */
export function combatBranch(state: GameState): CombatClass {
  const weapon = state.equipment.weapon ? getItem(state.equipment.weapon) : undefined
  const declared = weapon?.combatClass ?? 'melee'
  if (declared !== 'any') return declared
  const melee = (levelFromXp(state.skills.attack) + levelFromXp(state.skills.strength)) / 2
  return levelFromXp(state.skills.ranged) > melee ? 'ranged' : 'melee'
}

export function derivedStats(state: GameState): DerivedStats {
  // The attack style leans the same totals one way or another. Multiplicative so the
  // lean does not decay as levels climb - the same reason weapons multiply.
  const style = getCombatStyle(state.combat.style)?.effects ?? {}

  const defence = levelFromXp(state.skills.defence)
  const hitpoints = levelFromXp(state.skills.hitpoints)

  // Ranged is one skill doing the work of two: it supplies both the accuracy Attack
  // would have and the damage Strength would have. Melee keeps them separate, which is
  // the actual difference between the branches rather than a numbers tweak.
  const ranged = combatBranch(state) === 'ranged'
  const attack = ranged ? levelFromXp(state.skills.ranged) : levelFromXp(state.skills.attack)
  const strength = ranged ? levelFromXp(state.skills.ranged) : levelFromXp(state.skills.strength)

  return {
    maxHp: 50 + hitpoints * 8 + equippedTotal(state, 'hp'),
    accuracy: (10 + attack * 2 + equippedTotal(state, 'accuracy')) * (style.accuracy ?? 1),
    // Evasion rides on Defence too: heavier armour makes you harder to meaningfully hit.
    evasion: (8 + defence * 1.5 + equippedTotal(state, 'evasion')) * (style.evasion ?? 1),
    damage:
      (3 + strength * 1.2 + equippedTotal(state, 'damage')) *
      equippedProduct(state, 'damageMultiplier') *
      (1 + perkTotal(state.defeated, 'damageBonus')) *
      (style.damage ?? 1),
    armour: (defence * 0.8 + equippedTotal(state, 'armour')) * (style.armour ?? 1),
    attackInterval: Math.max(
      MIN_ATTACK_INTERVAL,
      BASE_ATTACK_INTERVAL - equippedTotal(state, 'attackSpeed'),
    ),
    // Expressed as a duration multiplier rather than a speed bonus so stacking is
    // sane: +25% and +25% gives 1/1.5, not a free ride to zero.
    cleave: Math.min(1, Math.max(0, equippedTotal(state, 'cleave'))),
    armourPierce: Math.min(0.9, Math.max(0, equippedTotal(state, 'armourPierce'))),
    // Fuel multiplies on top of equipment, so a good build and a burning cell compound.
    skillDurationScale:
      1 /
      ((1 + Math.max(0, equippedTotal(state, 'skillSpeed'))) *
        effectiveSpeed(state)),
    damageType: equippedDamageType(state),
    resistances: equippedResistances(state),
  }
}

/** Mean of the four combat skill levels. Gates zone entry. */
/**
 * Combat level, from your **best** offensive branch rather than the average of all.
 *
 * Averaging a fifth skill in would have dropped every existing save by 7 to 19 levels
 * and locked people out of zones they had already opened - measured, not guessed. So
 * offence is whichever branch you have actually trained, and it is weighted double to
 * stand in for the two melee skills it replaces.
 *
 * That makes this a strict generalisation of the old formula: while Ranged trails your
 * melee average, `2 * (attack + strength) / 2 + defence + hitpoints` over 4 is exactly
 * `(attack + strength + defence + hitpoints) / 4`. Nobody's combat level moves unless
 * Ranged overtakes, in which case it can only go up.
 */
export function combatLevel(state: GameState): number {
  const melee = (levelFromXp(state.skills.attack) + levelFromXp(state.skills.strength)) / 2
  const offence = Math.max(melee, levelFromXp(state.skills.ranged))
  const defence = levelFromXp(state.skills.defence)
  const hitpoints = levelFromXp(state.skills.hitpoints)
  return Math.floor((offence * 2 + defence + hitpoints) / 4)
}
