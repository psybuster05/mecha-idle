import type { SkillDef } from '../types'

/**
 * Refining - turns raw salvage into usable stock.
 *
 * The first skill with inputs, and therefore the first place the economy can
 * bottleneck. Every action here halts if the bank runs dry.
 *
 * Same eight-tier pacing as Scavenging (see that file), with longer actions and
 * proportionally more xp each, since every one of them eats gathered material.
 */
export const REFINING: SkillDef = {
  id: 'refining',
  name: 'Refining',
  description: 'Furnace and crucible. Heat is the only argument scrap responds to.',
  actions: [
    {
      id: 'smelt_steel',
      name: 'Smelt Steel Ingot',
      description: 'Reduce scrap to something with a shape you chose.',
      levelRequired: 1,
      duration: 4,
      inputs: [{ item: 'scrap_steel', qty: 2 }],
      outputs: [{ item: 'steel_ingot', qty: 1 }],
      xp: 4,
    },
    {
      id: 'draw_wire',
      name: 'Draw Copper Wire',
      description: 'Pull it fine enough and it carries a signal again.',
      levelRequired: 10,
      duration: 5,
      inputs: [{ item: 'copper_wiring', qty: 2 }],
      outputs: [{ item: 'wire_spool', qty: 1 }],
      xp: 6,
    },
    {
      id: 'cast_titanium',
      name: 'Cast Titanium Plate',
      description: 'The shards remember being armour. You remind them.',
      levelRequired: 20,
      duration: 5,
      inputs: [
        { item: 'titanium_shard', qty: 3 },
        { item: 'steel_ingot', qty: 1 },
      ],
      outputs: [{ item: 'titanium_plate', qty: 1 }],
      xp: 9,
    },
    {
      id: 'charge_cell',
      name: 'Charge Power Cell',
      description: 'You give up some of your own reserve to fill it. It feels like a choice.',
      levelRequired: 30,
      duration: 6,
      inputs: [
        { item: 'power_cell', qty: 1 },
        { item: 'wire_spool', qty: 2 },
      ],
      outputs: [{ item: 'charged_cell', qty: 1 }],
      xp: 14,
    },
    {
      id: 'true_bearings',
      name: 'True Bearing Assembly',
      description: 'Seat them, shim them, spin them. Nothing you build with these will grind.',
      levelRequired: 45,
      duration: 6,
      inputs: [
        { item: 'sealed_bearing', qty: 2 },
        { item: 'steel_ingot', qty: 2 },
      ],
      outputs: [{ item: 'bearing_assembly', qty: 1 }],
      xp: 19,
    },
    {
      id: 'grind_lenses',
      name: 'Align Lens Array',
      description: 'Stack them, align them, seal the housing. You can see properly again.',
      levelRequired: 60,
      duration: 7,
      inputs: [
        { item: 'optic_lens', qty: 2 },
        { item: 'titanium_plate', qty: 1 },
      ],
      outputs: [{ item: 'lens_array', qty: 1 }],
      xp: 32,
    },
    {
      id: 'press_weave',
      name: 'Press Weave Sheet',
      description: 'Heat and pressure, held exactly. Rush it and you get charcoal.',
      levelRequired: 75,
      duration: 7,
      inputs: [
        { item: 'carbon_weave', qty: 3 },
        { item: 'bearing_assembly', qty: 1 },
      ],
      outputs: [{ item: 'weave_sheet', qty: 1 }],
      xp: 44,
    },
    {
      id: 'reforge_core',
      name: 'Reforge Core Matrix',
      description: 'Coax a dead lattice back into humming. Mostly it does not work. Then it does.',
      levelRequired: 90,
      duration: 8,
      inputs: [
        { item: 'fused_core', qty: 2 },
        { item: 'lens_array', qty: 1 },
        { item: 'charged_cell', qty: 1 },
      ],
      outputs: [{ item: 'core_matrix', qty: 1 }],
      xp: 72,
    },
  ],
}
