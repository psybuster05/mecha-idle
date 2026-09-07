import type { EquipStats } from '../content/types'
import { DAMAGE_TYPES, type DamageType } from '../sim/state'

/**
 * Turning equipment stats into something readable.
 *
 * Not every stat is a number - `damageType` is a string and `resist` is an object - and
 * a naive `+${value} ${key}` printed "[object Object] resist" on every armour piece.
 * Multipliers and fractions also mean nothing raw: "+0.25 skillSpeed" is worse than
 * "+25% work speed" in every way.
 */

const TYPE_LABEL: Record<DamageType, string> = {
  kinetic: 'KIN',
  energy: 'NRG',
  emp: 'EMP',
}

const FLAT_LABELS: Partial<Record<keyof EquipStats, string>> = {
  hp: 'HP',
  damage: 'damage',
  accuracy: 'accuracy',
  armour: 'armour',
  evasion: 'evasion',
}

/** Short readable phrases, one per meaningful stat. */
export function describeStats(stats: EquipStats | undefined): string[] {
  if (!stats) return []
  const parts: string[] = []

  for (const [key, label] of Object.entries(FLAT_LABELS) as [keyof EquipStats, string][]) {
    const value = stats[key]
    if (typeof value !== 'number' || value === 0) continue
    parts.push(`${value > 0 ? '+' : ''}${value} ${label}`)
  }

  if (stats.damageMultiplier && stats.damageMultiplier !== 1) {
    parts.push(`×${stats.damageMultiplier} damage`)
  }
  if (stats.attackSpeed) {
    // Negative attack speed is a slower weapon, which is a real trade, not a penalty.
    parts.push(stats.attackSpeed > 0 ? `${stats.attackSpeed}s faster` : `${-stats.attackSpeed}s slower`)
  }
  if (stats.skillSpeed) parts.push(`+${Math.round(stats.skillSpeed * 100)}% work speed`)
  if (stats.armourPierce) parts.push(`${Math.round(stats.armourPierce * 100)}% armour pierce`)
  if (stats.cleave) parts.push(`${Math.round(stats.cleave * 100)}% cleave`)
  if (stats.damageType) parts.push(`deals ${TYPE_LABEL[stats.damageType]}`)

  if (stats.resist) {
    for (const type of DAMAGE_TYPES) {
      const value = stats.resist[type]
      if (value === undefined || value === 1) continue
      parts.push(`${TYPE_LABEL[type]} ×${value}`)
    }
  }

  return parts
}

export function statLine(stats: EquipStats | undefined): string {
  return describeStats(stats).join(' · ')
}
