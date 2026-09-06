import type { SkillDef } from '../types'

/**
 * Refining - turns raw salvage into usable stock.
 *
 * The first skill with inputs, and therefore the first place the economy can
 * bottleneck. Every action here halts if the bank runs dry.
 */
export const REFINING: SkillDef = {
  id: 'refining',
  name: 'Refining',
  description:
    'Furnace and crucible. Heat is the only argument scrap responds to.',
  actions: [
    {
      id: 'smelt_steel',
      name: 'Smelt Steel Ingot',
      description: 'Reduce scrap to something with a shape you chose.',
      levelRequired: 1,
      duration: 4,
      inputs: [{ item: 'scrap_steel', qty: 2 }],
      outputs: [{ item: 'steel_ingot', qty: 1 }],
      xp: 8,
    },
    {
      id: 'draw_wire',
      name: 'Draw Copper Wire',
      description: 'Pull it fine enough and it carries a signal again.',
      levelRequired: 10,
      duration: 4,
      inputs: [{ item: 'copper_wiring', qty: 2 }],
      outputs: [{ item: 'wire_spool', qty: 1 }],
      xp: 15,
    },
    {
      id: 'cast_titanium',
      name: 'Cast Titanium Plate',
      description: 'The shards remember being armour. You remind them.',
      levelRequired: 30,
      duration: 6,
      inputs: [
        { item: 'titanium_shard', qty: 3 },
        { item: 'steel_ingot', qty: 1 },
      ],
      outputs: [{ item: 'titanium_plate', qty: 1 }],
      xp: 40,
    },
    {
      id: 'charge_cell',
      name: 'Charge Power Cell',
      description: 'You give up some of your own reserve to fill it. It feels like a choice.',
      levelRequired: 45,
      duration: 8,
      inputs: [
        { item: 'power_cell', qty: 1 },
        { item: 'wire_spool', qty: 2 },
      ],
      outputs: [{ item: 'charged_cell', qty: 1 }],
      xp: 70,
    },
  ],
}
