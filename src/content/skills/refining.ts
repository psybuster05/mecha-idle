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

    // --- Ship Graveyard line, at the same thresholds and rates as above. ---
    {
      id: 'temper_marine',
      name: 'Temper Marine Alloy',
      description: 'Quench it in brine, as they did. It comes out meaner than steel.',
      levelRequired: 45,
      duration: 6,
      inputs: [
        { item: 'hull_plate', qty: 3 },
        { item: 'steel_ingot', qty: 1 },
      ],
      outputs: [{ item: 'marine_alloy', qty: 1 }],
      xp: 19,
    },
    {
      id: 'seat_seal',
      name: 'Seat Pressure Seal',
      description: 'Fine work. A seal that almost holds is a seal that does not.',
      levelRequired: 60,
      duration: 7,
      inputs: [
        { item: 'hydraulic_ram', qty: 2 },
        { item: 'wire_spool', qty: 3 },
      ],
      outputs: [{ item: 'pressure_seal', qty: 1 }],
      xp: 32,
    },

    // --- Abandoned Airfield line ---
    {
      id: 'roll_alumide',
      name: 'Roll Alumide Sheet',
      description: 'Pass it through cold, again and again. Rushing it puts a grain in that never comes out.',
      levelRequired: 60,
      duration: 7,
      inputs: [
        { item: 'airframe_spar', qty: 4 },
        { item: 'titanium_plate', qty: 1 },
      ],
      outputs: [{ item: 'alumide_sheet', qty: 1 }],
      xp: 32,
    },
    {
      id: 'sync_guidance',
      name: 'Synchronise Guidance Module',
      description: 'Three boards that disagree, argued into consensus. It is the closest thing to a conversation you have had.',
      levelRequired: 75,
      duration: 7,
      inputs: [
        { item: 'avionics_board', qty: 3 },
        { item: 'wire_spool', qty: 4 },
      ],
      outputs: [{ item: 'guidance_module', qty: 1 }],
      xp: 44,
    },

    // --- Bridge Checkpoint line ---
    {
      id: 'fire_ceramic',
      name: 'Fire Ablative Ceramic',
      description: 'Layer, fire, cool, repeat. Hurry any step and it comes out as gravel.',
      levelRequired: 60,
      duration: 7,
      inputs: [
        { item: 'ceramic_composite', qty: 3 },
        { item: 'steel_ingot', qty: 2 },
      ],
      outputs: [{ item: 'ablative_ceramic', qty: 1 }],
      xp: 32,
    },
    {
      id: 'draw_lattice',
      name: 'Draw Hardened Lattice',
      description: 'The same structure that stops a round will part one, if you draw it to a point.',
      levelRequired: 75,
      duration: 7,
      inputs: [
        { item: 'barrier_segment', qty: 4 },
        { item: 'titanium_plate', qty: 2 },
      ],
      outputs: [{ item: 'hardened_lattice', qty: 1 }],
      xp: 44,
    },

    // --- The City line ---
    {
      id: 'sinter_polymer',
      name: 'Sinter Polymer',
      description: 'Heat it to just short of ruin and it becomes something worth keeping.',
      levelRequired: 60,
      duration: 7,
      inputs: [
        { item: 'polymer_frame', qty: 4 },
        { item: 'steel_ingot', qty: 1 },
      ],
      outputs: [{ item: 'sintered_polymer', qty: 1 }],
      xp: 32,
    },
    {
      id: 'invert_collar',
      name: 'Invert Control Collar',
      description: 'The same circuit, wired backwards. It took you an hour and thirty years.',
      levelRequired: 90,
      duration: 8,
      inputs: [
        { item: 'control_collar', qty: 2 },
        { item: 'wire_spool', qty: 5 },
      ],
      outputs: [{ item: 'command_relay', qty: 1 }],
      xp: 72,
    },
  ],
}
