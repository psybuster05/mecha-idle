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
  {
    id: 'sealed_bearing',
    name: 'Sealed Bearing',
    description: 'Packed in grease that never broke down. It still spins true.',
    category: 'component',
  },
  {
    id: 'optic_lens',
    name: 'Optic Lens',
    description: 'Ground glass, unclouded. Someone made this by hand.',
    category: 'component',
  },
  {
    id: 'carbon_weave',
    name: 'Carbon Weave',
    description: 'Lighter than the steel it outperforms. The old world knew things.',
    category: 'material',
  },
  {
    id: 'fused_core',
    name: 'Fused Core',
    description: 'Slagged into one mass by whatever ended everything. Still holds a charge.',
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
  {
    id: 'bearing_assembly',
    name: 'Bearing Assembly',
    description: 'Trued and seated. Nothing you build with this will grind.',
    category: 'material',
  },
  {
    id: 'lens_array',
    name: 'Lens Array',
    description: 'Stacked and aligned. You can see the horizon properly for the first time.',
    category: 'material',
  },
  {
    id: 'weave_sheet',
    name: 'Weave Sheet',
    description: 'Pressed flat under heat. Takes a hit like plate at a third the mass.',
    category: 'material',
  },
  {
    id: 'core_matrix',
    name: 'Core Matrix',
    description: 'Rebuilt from slag into something that hums again.',
    category: 'component',
  },

  // --- Equippable parts (Fabrication) --------------------------------------
  //
  // Arms carry skillSpeed and legs carry moveSpeed. That is the whole "unlockable
  // speed-up" axis: your arms do the work, your legs do the walking, and upgrading
  // them is how you buy back time.
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
    stats: { accuracy: 5, damage: 2, skillSpeed: 0.08 },
  },
  {
    id: 'legs_tracked',
    name: 'Tracked Legs',
    description: 'Slower than the originals. Far harder to knock down.',
    category: 'part',
    slot: 'legs',
    stats: { armour: 3, hp: 10, moveSpeed: 12 },
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
  {
    id: 'frame_titanium',
    name: 'Titanium Exoframe',
    description: 'You stop flinching at things that used to dent you.',
    category: 'part',
    slot: 'frame',
    stats: { hp: 90, armour: 8 },
  },
  {
    id: 'arms_precision',
    name: 'Precision Manipulators',
    description: 'Fine enough to strip a board without looking. Work goes faster now.',
    category: 'part',
    slot: 'arms',
    stats: { accuracy: 18, damage: 9, skillSpeed: 0.25 },
  },
  {
    id: 'legs_thruster',
    name: 'Thruster Legs',
    description: 'You do not so much walk as decide to be somewhere else.',
    category: 'part',
    slot: 'legs',
    stats: { armour: 9, hp: 30, moveSpeed: 45 },
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
