import type { ItemDef } from './types'
import type { ItemId } from '../sim/state'

/**
 * Every item in the game.
 *
 * Ids are snake_case and permanent - they end up in save files, so renaming one is
 * a save migration, not a rename. Display names can change freely.
 */
export const ITEMS: readonly ItemDef[] = [
  // --- Raw salvage (Scavenging) -------------------------------------------
  {
    id: 'scrap_steel',
    name: 'Scrap Steel',
    description: 'Twisted structural steel. The ruins are made of it.',
    category: 'material',
  },
  {
    id: 'copper_wiring',
    name: 'Copper Wiring',
    description: 'Stripped from walls that no longer carry anything.',
    category: 'material',
  },
  {
    id: 'titanium_shard',
    name: 'Titanium Shard',
    description: 'Fragments of something built to outlast its makers. It did.',
    category: 'material',
  },
  {
    id: 'intact_servo',
    name: 'Intact Servo',
    description: 'Still holds tension. Rare, in a field of things that do not.',
    category: 'component',
  },
  {
    id: 'power_cell',
    name: 'Depleted Power Cell',
    description: 'Empty, but the casing is sound. That is the hard part.',
    category: 'component',
  },

  // --- Refined stock (Refining) -------------------------------------------
  {
    id: 'steel_ingot',
    name: 'Steel Ingot',
    description: 'Reduced to something honest.',
    category: 'material',
  },
  {
    id: 'wire_spool',
    name: 'Wire Spool',
    description: 'Drawn fine enough to carry a signal again.',
    category: 'material',
  },
  {
    id: 'titanium_plate',
    name: 'Titanium Plate',
    description: 'Cast flat and true. Heavy in a way that feels like safety.',
    category: 'material',
  },
  {
    id: 'charged_cell',
    name: 'Charged Cell',
    description: 'Warm to the touch. You remember warmth.',
    category: 'component',
  },
  // --- Equippable parts (Fabrication) --------------------------------------
  {
    id: 'frame_steel',
    name: 'Welded Steel Frame',
    description: 'Not the chassis you were built with. It holds.',
    category: 'part',
    slot: 'frame',
    stats: { hp: 25, armour: 2 },
  },
  {
    id: 'arms_servo',
    name: 'Servo Arms',
    description: 'Salvaged actuators, re-tensioned. They answer faster than you expect.',
    category: 'part',
    slot: 'arms',
    stats: { accuracy: 5, damage: 2 },
  },
  {
    id: 'legs_tracked',
    name: 'Tracked Legs',
    description: 'Slower than the originals. Far harder to knock down.',
    category: 'part',
    slot: 'legs',
    stats: { armour: 3, hp: 10 },
  },
  {
    id: 'weapon_rivet',
    name: 'Rivet Driver',
    description: 'A construction tool. It was never meant for this, and neither were you.',
    category: 'part',
    slot: 'weapon',
    stats: { damage: 5, accuracy: 3 },
  },
  {
    id: 'reactor_cell',
    name: 'Cell Reactor',
    description: 'Steady output at last. The tremor in your servos stops.',
    category: 'part',
    slot: 'reactor',
    stats: { attackSpeed: 0.4, hp: 5 },
  },
] as const

const byId = new Map<ItemId, ItemDef>(ITEMS.map((item) => [item.id, item]))

export function getItem(id: ItemId): ItemDef | undefined {
  return byId.get(id)
}

/** Display name, falling back to the raw id so a missing item is visible, not silent. */
export function itemName(id: ItemId): string {
  return byId.get(id)?.name ?? id
}
