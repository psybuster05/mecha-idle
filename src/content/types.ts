/**
 * Shapes for the content tables.
 *
 * Everything in src/content/ is *data*. Adding a skill, an action, an item, or an
 * enemy should mean editing a table in here - never writing engine code. That is
 * what lets this game grow to Melvor-like breadth without the sim getting bigger.
 */

import type { ActionId, EquipSlot, GatheringSkillId, ItemId } from '../sim/state'

export interface ItemStack {
  item: ItemId
  qty: number
}

/** An output that only lands some of the time. `chance` is 0..1. */
export interface DropChance {
  item: ItemId
  qty: number
  chance: number
}

export type ItemCategory = 'material' | 'component' | 'part'

export interface EquipStats {
  /** Improves the chance our attacks land. */
  accuracy?: number
  /** Added to damage per hit. */
  damage?: number
  /** Reduces incoming damage. */
  armour?: number
  /** Added to maximum integrity (HP). */
  integrity?: number
  /** Seconds shaved off our attack interval. Negative values would slow us down. */
  attackSpeed?: number
}

export interface ItemDef {
  id: ItemId
  name: string
  description: string
  category: ItemCategory
  /** Sprite key resolved by the UI layer. Art lands later; absent means placeholder. */
  sprite?: string
  /** Present only on equippable parts. */
  slot?: EquipSlot
  stats?: EquipStats
  /** Level in the relevant combat skill needed to equip. */
  equipLevel?: number
}

export interface SkillAction {
  id: ActionId
  name: string
  /** Flavour. Shown under the action name. */
  description: string
  levelRequired: number
  /** Base seconds per completion. */
  duration: number
  /**
   * Consumed on every completion. Omit for gathering actions that take no inputs.
   * If the bank cannot cover these, the action halts.
   */
  inputs?: ItemStack[]
  /** Produced on every completion. */
  outputs: ItemStack[]
  /** Rolled independently on every completion. */
  drops?: DropChance[]
  /** Xp awarded to the parent skill per completion. */
  xp: number
}

export interface SkillDef {
  id: GatheringSkillId
  name: string
  /**
   * In-fiction, skills are recovered subroutines rather than learned trades.
   * This line is the flavour shown at the top of the skill panel.
   */
  description: string
  actions: SkillAction[]
}
