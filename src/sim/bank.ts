/**
 * Item storage. Pure helpers over `state.bank`.
 *
 * Every function that takes `state` mutates it - they are called from inside `tick`,
 * which has already cloned. Read-only helpers are named `count` / `hasAll` / `maxCraftable`.
 */

import type { ItemStack } from '../content/types'
import type { GameState, ItemId } from './state'

export function count(state: GameState, item: ItemId): number {
  return state.bank[item] ?? 0
}

/** Mutates. Negative or zero quantities are ignored. */
export function addItem(state: GameState, item: ItemId, qty: number): void {
  if (qty <= 0) return
  state.bank[item] = count(state, item) + qty
}

/**
 * Mutates. Returns false and changes nothing if the bank cannot cover `qty`.
 */
export function removeItem(state: GameState, item: ItemId, qty: number): boolean {
  if (qty <= 0) return true
  const have = count(state, item)
  if (have < qty) return false
  const left = have - qty
  // Delete rather than storing zeroes, so saves stay small and the bank UI
  // does not fill with items the player has never actually held.
  if (left === 0) delete state.bank[item]
  else state.bank[item] = left
  return true
}

export function hasAll(state: GameState, stacks: readonly ItemStack[]): boolean {
  return stacks.every((stack) => count(state, stack.item) >= stack.qty)
}

/**
 * How many times `stacks` could be paid for out of the bank.
 * Returns Infinity when there is nothing to pay - which is the common case, since
 * gathering actions have no inputs.
 */
export function maxCraftable(state: GameState, stacks: readonly ItemStack[] | undefined): number {
  if (!stacks || stacks.length === 0) return Number.POSITIVE_INFINITY
  let limit = Number.POSITIVE_INFINITY
  for (const stack of stacks) {
    if (stack.qty <= 0) continue
    limit = Math.min(limit, Math.floor(count(state, stack.item) / stack.qty))
  }
  return limit
}

/** Mutates. Pays `stacks` `times` over. Caller must have checked affordability. */
export function payCost(
  state: GameState,
  stacks: readonly ItemStack[] | undefined,
  times: number,
): void {
  if (!stacks || times <= 0) return
  for (const stack of stacks) removeItem(state, stack.item, stack.qty * times)
}

/** Mutates. Credits `stacks` `times` over. */
export function grantAll(
  state: GameState,
  stacks: readonly ItemStack[],
  times: number,
): void {
  if (times <= 0) return
  for (const stack of stacks) addItem(state, stack.item, stack.qty * times)
}
