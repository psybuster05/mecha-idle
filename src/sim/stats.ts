/**
 * Derived combat stats.
 *
 * Nothing here is stored in state - stats are always recomputed from skill xp plus
 * equipped parts. That means a balance change to an item takes effect immediately
 * for existing saves, with no migration.
 */

import { getItem } from '../content'
import type { EquipStats } from '../content/types'
import { EQUIP_SLOTS, type GameState } from './state'
import { levelFromXp } from './xp'

/** Seconds between our swings with no reactor fitted. */
export const BASE_ATTACK_INTERVAL = 3
/** However much attack speed is stacked, swings never get faster than this. */
export const MIN_ATTACK_INTERVAL = 1.2
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
}

/** Sum of one stat across everything currently equipped. */
function equippedTotal(state: GameState, stat: keyof EquipStats): number {
  let total = 0
  for (const slot of EQUIP_SLOTS) {
    const itemId = state.equipment[slot]
    if (!itemId) continue
    total += getItem(itemId)?.stats?.[stat] ?? 0
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
    evasion: 8 + defence * 1.5,
    damage: 3 + strength * 1.2 + equippedTotal(state, 'damage'),
    armour: defence * 0.8 + equippedTotal(state, 'armour'),
    attackInterval: Math.max(
      MIN_ATTACK_INTERVAL,
      BASE_ATTACK_INTERVAL - equippedTotal(state, 'attackSpeed'),
    ),
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
