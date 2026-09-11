import type { BossPhase, EnemyDef } from '../content/enemies'
import type { DamageType } from '../sim/state'

/**
 * A boss's record, read before the fight rather than discovered during it.
 *
 * Bosses are designed as preparation puzzles: the fight is decided before it starts, and
 * a phase can invert which weapon is right. That only works if the player can see the
 * puzzle. They could not - the row before a fight showed base resistances and nothing
 * about the phases, so the first attempt at every boss was blind and a failed one cost
 * real time. This turns each phase into plain words: when it arrives, what it changes,
 * and what that means for the weapon you are holding.
 *
 * Pure, and in the UI layer rather than content: it is presentation of data that already
 * exists, not new data. Nothing here is a second copy of a number - every line is derived
 * from the phase it describes, so it cannot drift from the fight it promises.
 */

type Resistances = Partial<Record<DamageType, number>>

/** Written out. The rest of the UI abbreviates these, and it reads as a glossary. */
export const TYPE_NAME: Record<DamageType, string> = {
  kinetic: 'kinetic',
  energy: 'energy',
  emp: 'EMP',
}

export interface DossierStep {
  /** "Opens" for the starting state, else the HP threshold that triggers it. */
  at: string
  name: string
  message?: string
  /** What changes, in words. Empty for the opening. */
  effects: string[]
  resistances: Resistances
  /** What it deals from this point on. */
  damageType: DamageType
}

const pct = (x: number) => Math.round(x * 100)

/** What a phase changes, relative to the boss as it opened. */
export function phaseEffects(phase: BossPhase, baseType: DamageType): string[] {
  const out: string[] = []
  const d = phase.damageMultiplier
  if (d !== undefined && d !== 1) {
    out.push(d > 1 ? `hits ${pct(d - 1)}% harder` : `hits ${pct(1 - d)}% softer`)
  }
  // An interval multiplier is a *time between* swings, so a lower one means more of them.
  // Reported as a rate, because "attacks 67% faster" is what the player feels.
  const i = phase.attackIntervalMultiplier
  if (i !== undefined && i !== 1) {
    const rate = 1 / i
    out.push(rate > 1 ? `attacks ${pct(rate - 1)}% faster` : `attacks ${pct(1 - rate)}% slower`)
  }
  const a = phase.armourMultiplier
  if (a !== undefined && a !== 1) {
    out.push(a > 1 ? `armour +${pct(a - 1)}%` : `armour −${pct(1 - a)}%`)
  }
  const e = phase.evasionMultiplier
  if (e !== undefined && e !== 1) {
    const x = `evasion ×${e.toFixed(1)}`
    out.push(e >= 1.5 ? `${x} — hard to land hits` : e <= 0.5 ? `${x} — wide open` : x)
  }
  if (phase.damageType && phase.damageType !== baseType) {
    out.push(`switches to ${TYPE_NAME[phase.damageType]} attacks`)
  }
  return out
}

/**
 * The fight, start to finish: how it opens, then each phase in the order it arrives.
 *
 * Sorted by threshold rather than trusted to be written in order, because the order here
 * is a promise about the fight and a content table is not obliged to keep it.
 */
export function dossier(enemy: EnemyDef): DossierStep[] {
  const base = enemy.resistances ?? {}
  const steps: DossierStep[] = [
    { at: 'Opens', name: 'Opening', effects: [], resistances: base, damageType: enemy.damageType },
  ]
  const phases = [...(enemy.phases ?? [])].sort((a, b) => b.below - a.below)
  for (const phase of phases) {
    steps.push({
      at: `Below ${pct(phase.below)}%`,
      name: phase.name,
      message: phase.message,
      effects: phaseEffects(phase, enemy.damageType),
      // A phase's resistances replace the base entirely; absent means it keeps them.
      resistances: phase.resistances ?? base,
      damageType: phase.damageType ?? enemy.damageType,
    })
  }
  return steps
}

/**
 * The one line that answers "is my weapon right for this part?"
 *
 * Only said when it matters. Every phase carrying a verdict would make the two that are
 * actually the point - the one that walls you and the one that opens up - read the same
 * as the ones that barely move.
 */
export function verdict(
  resistances: Resistances,
  mine: DamageType,
): { tone: 'good' | 'bad'; text: string } | null {
  const v = resistances[mine] ?? 1
  const name = TYPE_NAME[mine]
  if (v <= 0.6) return { tone: 'bad', text: `Your ${name} barely lands here (×${v.toFixed(2)}).` }
  if (v >= 1.25) return { tone: 'good', text: `Your ${name} lands hard here (×${v.toFixed(2)}).` }
  return null
}
