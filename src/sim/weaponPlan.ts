import { getEnemy, getItem } from '../content'
import { activePhase, type EnemyDef } from '../content/enemies'
import type { GameState, ItemId } from './state'

/**
 * Switching weapons between a boss's phases.
 *
 * Bosses are preparation puzzles: a phase can invert which weapon is right. The record
 * shows you that in advance, but with one weapon slot you could only *choose* the right
 * weapon before the fight, never *switch* to it when the phase arrived - so a phase that
 * walled your weapon was a stretch of wasted time you sat through, and every boss came
 * down to "the weapon that is best on average". A plan names a weapon per phase, and the
 * mech changes to it the instant the phase begins.
 *
 * It is the idle-game answer to mid-fight decisions: you make them in advance, as rules,
 * and they play out with nobody at the keyboard.
 *
 * **Nothing here moves your gear.** The fight sees a *view* of the state - `fightingAs` -
 * with the weapon slot replaced by whatever the plan names for the current phase. Your
 * equipped weapon never changes, the bank is never shuffled, and there is nothing to put
 * back when the fight ends or you stop. The Equipment page always shows what you chose.
 *
 * **Derived, never stored.** Which weapon is in use is a function of the boss, its HP and
 * the plan - the same way the phase itself is derived from HP rather than kept as a flag.
 * That is what keeps the offline guarantee: the switch happens at the event that causes
 * it, the threshold crossing, however the time is sliced.
 */

/** The plan key for the part of the fight before the first threshold. */
export const OPENING = 'opening'

/** The key a boss's current phase is planned under. */
export function phaseKey(enemy: EnemyDef, hp: number): string {
  return activePhase(enemy, hp)?.name ?? OPENING
}

/** Every key a plan for this boss may use: the opening, then each phase by name. */
export function planKeys(enemy: EnemyDef): string[] {
  return [OPENING, ...(enemy.phases ?? []).map((phase) => phase.name)]
}

/** A weapon you could switch to: one you have fitted, or one sitting in the bank. */
export function ownsWeapon(state: GameState, id: ItemId): boolean {
  if (getItem(id)?.slot !== 'weapon') return false
  return state.equipment.weapon === id || (state.bank[id] ?? 0) > 0
}

/** Every weapon you could plan with, fitted first and the rest by name. */
export function ownedWeapons(state: GameState): ItemId[] {
  const fitted = state.equipment.weapon
  const spares = Object.keys(state.bank)
    .filter((id) => id !== fitted && ownsWeapon(state, id))
    .sort((a, b) => (getItem(a)?.name ?? a).localeCompare(getItem(b)?.name ?? b))
  return fitted ? [fitted, ...spares] : spares
}

/**
 * The weapon the plan wants right now, or null for "whatever is fitted".
 *
 * Null outside a boss fight, for a boss with no plan, for a phase the plan leaves blank,
 * and for a planned weapon you no longer own - salvaged it, say. Falling back to the
 * fitted weapon in every one of those cases means a plan can only ever *add* a switch; it
 * can never leave the mech empty-handed.
 */
export function plannedWeapon(state: GameState): ItemId | null {
  if (state.actors.mech.activity?.kind !== 'combat') return null
  const id = state.combat.enemyId
  const enemy = id ? getEnemy(id) : undefined
  if (!enemy?.isBoss) return null
  const planned = state.weaponPlans[enemy.id]?.[phaseKey(enemy, state.combat.enemyHp)]
  return planned && ownsWeapon(state, planned) ? planned : null
}

/**
 * The state as the fight sees it: your gear, with the weapon the plan names for this
 * phase in the weapon slot.
 *
 * Returns the state itself when there is nothing to switch, so with no plans the fight is
 * byte-for-byte the one every boss budget was measured against. The copy is shallow - only
 * the equipment object is new - so it is only ever *read*: everything that mutates takes
 * the real state.
 */
export function fightingAs(state: GameState): GameState {
  const planned = plannedWeapon(state)
  if (!planned || planned === state.equipment.weapon) return state
  return { ...state, equipment: { ...state.equipment, weapon: planned } }
}
