/**
 * Shapes for the content tables.
 *
 * Everything in src/content/ is *data*. Adding a skill, an action, an item, or an
 * enemy should mean editing a table in here - never writing engine code. That is
 * what lets this game grow to Melvor-like breadth without the sim getting bigger.
 */

import type {
  ActionId,
  DamageType,
  EquipSlot,
  GatheringSkillId,
  ItemId,
  Resistances,
} from '../sim/state'

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
  /** Added to damage per hit. Flat, so it fades as levels grow - use it for trim. */
  damage?: number
  /**
   * Multiplies total damage. **This is the main weapon lever, not `damage`.**
   *
   * Flat weapon damage is swamped by level scaling: +34 is +45% at level 60 and +28%
   * at 99, while attackSpeed is a share of a fixed 3s base and never decays. That made
   * cadence the only stat that mattered and turned every slow heavy weapon into a trap.
   * A multiplier holds its value at every level, so archetypes stay archetypes.
   */
  damageMultiplier?: number
  /** Reduces incoming damage. */
  armour?: number
  /**
   * Makes attacks miss. Opposed against attacker accuracy, so it scales rather than
   * saturating - light frames dodge what heavy plate has to absorb.
   */
  evasion?: number
  /** Added to maximum HP. */
  hp?: number
  /**
   * Fraction faster that non-combat actions complete. 0.25 means 25% quicker.
   * Lives on Arms: your hands do the work, so better hands do it sooner.
   */
  skillSpeed?: number
  /** Map units per second added to movement. Thrusters, tracks, better legs. */
  moveSpeed?: number
  /** What this weapon deals. Only meaningful on the weapon slot. */
  damageType?: DamageType
  /** Incoming damage multipliers this part grants. Armour pieces carry these. */
  resist?: Resistances
  /**
   * Fraction of the target's armour ignored, 0..1.
   *
   * Armour mitigates multiplicatively, so more damage is no answer to it - a heavily
   * plated enemy is simply an enemy with more effective HP. Penetration is the only
   * thing that actually replies, which is what makes an armoured zone a real question
   * rather than a slower one.
   */
  armourPierce?: number
  /**
   * Fraction of overkill damage carried to the next enemy. 1 wastes nothing.
   *
   * This is what makes a slow heavy weapon an archetype rather than a trap. Enemies
   * mostly die in one to three hits, so a big swing throws away most of itself - a
   * 255-damage hit into a 130 HP drone wasted half. Cleave turns that waste into the
   * weapon's identity: nothing is lost, so weight competes with cadence.
   */
  cleave?: number
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
