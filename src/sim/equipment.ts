/**
 * Fitting parts to the mech.
 *
 * In fiction these are not tools you carry - they are your body. Equipping moves the
 * item out of the bank; unequipping puts it back, so a part is only ever in one place.
 */

import { getItem } from '../content'
import { addItem, count, removeItem } from './bank'
import type { EquipSlot, GameState, ItemId } from './state'

export type EquipFailure = 'unknown-item' | 'not-equippable' | 'not-in-bank'

/**
 * Mutates. Fits `itemId`, returning to the bank whatever occupied the slot.
 * Returns null on success, or why it failed.
 */
export function equipItem(state: GameState, itemId: ItemId): EquipFailure | null {
  const item = getItem(itemId)
  if (!item) return 'unknown-item'
  if (!item.slot) return 'not-equippable'
  if (count(state, itemId) < 1) return 'not-in-bank'

  removeItem(state, itemId, 1)
  const previous = state.equipment[item.slot]
  if (previous) addItem(state, previous, 1)
  state.equipment[item.slot] = itemId
  return null
}

/** Mutates. Returns the slot's contents to the bank. No-op on an empty slot. */
export function unequipSlot(state: GameState, slot: EquipSlot): void {
  const itemId = state.equipment[slot]
  if (!itemId) return
  delete state.equipment[slot]
  addItem(state, itemId, 1)
}
