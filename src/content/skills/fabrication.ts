import type { SkillDef } from '../types'

/**
 * Fabrication - refined stock becomes parts of your own body.
 *
 * The end of the production chain, and where the speed-up upgrades live: Arms grant
 * skillSpeed, Legs grant evasion. Building better arms is how you buy back time.
 *
 * Same eight-tier pacing as the other skills. Actions are the longest in the game,
 * with xp to match, because each one consumes a stack of processed stock.
 */
export const FABRICATION: SkillDef = {
  id: 'fabrication',
  name: 'Fabrication',
  description:
    'Self-repair protocols, running far past their intended scope. You are rebuilding yourself out of a dead world.',
  actions: [
    {
      id: 'fab_frame_steel',
      name: 'Welded Steel Frame',
      description: 'A new spine. The old one is somewhere under the rubble.',
      levelRequired: 1,
      duration: 6,
      inputs: [{ item: 'steel_ingot', qty: 5 }],
      outputs: [{ item: 'frame_steel', qty: 1 }],
      xp: 6,
    },
    {
      id: 'fab_arms_servo',
      name: 'Servo Arms',
      description: 'Actuators that answer on the first request. Everything you do gets quicker.',
      levelRequired: 10,
      duration: 7,
      inputs: [
        { item: 'steel_ingot', qty: 4 },
        { item: 'wire_spool', qty: 2 },
      ],
      outputs: [{ item: 'arms_servo', qty: 1 }],
      xp: 9,
    },
    {
      id: 'fab_legs_tracked',
      name: 'Tracked Legs',
      description: 'You trade speed for the certainty of staying upright. Mostly.',
      levelRequired: 20,
      duration: 7,
      inputs: [
        { item: 'steel_ingot', qty: 6 },
        { item: 'scrap_steel', qty: 10 },
      ],
      outputs: [{ item: 'legs_tracked', qty: 1 }],
      xp: 12,
    },
    {
      id: 'fab_weapon_rivet',
      name: 'Rivet Driver',
      description: 'You catalogue it as a tool. The catalogue is not persuasive.',
      levelRequired: 30,
      duration: 8,
      inputs: [
        { item: 'steel_ingot', qty: 4 },
        { item: 'titanium_plate', qty: 1 },
        { item: 'wire_spool', qty: 1 },
      ],
      outputs: [{ item: 'weapon_rivet', qty: 1 }],
      xp: 19,
    },
    {
      id: 'fab_reactor_cell',
      name: 'Cell Reactor',
      description: 'Steady output. You had forgotten what that was like.',
      levelRequired: 45,
      duration: 8,
      inputs: [
        { item: 'charged_cell', qty: 1 },
        { item: 'titanium_plate', qty: 2 },
        { item: 'wire_spool', qty: 3 },
      ],
      outputs: [{ item: 'reactor_cell', qty: 1 }],
      xp: 26,
    },
    {
      id: 'fab_weapon_arc',
      name: 'Arc Projector',
      description: 'An energy weapon. Some things only give way to heat.',
      levelRequired: 45,
      duration: 8,
      inputs: [
        { item: 'charged_cell', qty: 2 },
        { item: 'lens_array', qty: 1 },
        { item: 'titanium_plate', qty: 2 },
      ],
      outputs: [{ item: 'weapon_arc', qty: 1 }],
      xp: 26,
    },
    {
      id: 'fab_weapon_pulse',
      name: 'Pulse Emitter',
      description: 'Kills the mind and leaves the body. Useful against things that think.',
      levelRequired: 60,
      duration: 9,
      inputs: [
        { item: 'charged_cell', qty: 3 },
        { item: 'bearing_assembly', qty: 2 },
        { item: 'wire_spool', qty: 6 },
      ],
      outputs: [{ item: 'weapon_pulse', qty: 1 }],
      xp: 40,
    },
    {
      id: 'fab_frame_titanium',
      name: 'Titanium Exoframe',
      description: 'Built to take what the last frame could not.',
      levelRequired: 60,
      duration: 9,
      inputs: [
        { item: 'titanium_plate', qty: 6 },
        { item: 'bearing_assembly', qty: 2 },
      ],
      outputs: [{ item: 'frame_titanium', qty: 1 }],
      xp: 40,
    },
    {
      id: 'fab_arms_precision',
      name: 'Precision Manipulators',
      description: 'The best thing you have ever built, and it is a pair of hands.',
      levelRequired: 75,
      duration: 10,
      inputs: [
        { item: 'weave_sheet', qty: 2 },
        { item: 'lens_array', qty: 1 },
        { item: 'bearing_assembly', qty: 3 },
      ],
      outputs: [{ item: 'arms_precision', qty: 1 }],
      xp: 63,
    },
    {
      id: 'fab_legs_thruster',
      name: 'Thruster Legs',
      description: 'The ruins stop being far apart.',
      levelRequired: 90,
      duration: 12,
      inputs: [
        { item: 'core_matrix', qty: 1 },
        { item: 'weave_sheet', qty: 3 },
        { item: 'bearing_assembly', qty: 4 },
      ],
      outputs: [{ item: 'legs_thruster', qty: 1 }],
      xp: 108,
    },

    // --- Ship Graveyard sidegrades. The Exoframe needs a boss drop, which is how
    // combat pays out without gating any skill ladder. ---
    {
      id: 'fab_weapon_harpoon',
      name: 'Harpoon Launcher',
      description: 'Slow, heavy, and final. Best against things that do not shrug off a hit.',
      levelRequired: 45,
      duration: 8,
      inputs: [
        { item: 'hydraulic_ram', qty: 2 },
        { item: 'marine_alloy', qty: 3 },
      ],
      outputs: [{ item: 'weapon_harpoon', qty: 1 }],
      xp: 26,
    },
    {
      id: 'fab_frame_marine',
      name: 'Marine Exoframe',
      description: 'Sealed the way the old hulls were. Heat stops being your problem.',
      levelRequired: 60,
      duration: 9,
      inputs: [
        { item: 'marine_alloy', qty: 5 },
        { item: 'pressure_seal', qty: 2 },
        { item: 'pressure_hull', qty: 1 },
      ],
      outputs: [{ item: 'frame_marine', qty: 1 }],
      xp: 40,
    },

    // --- Abandoned Airfield sidegrades: the light build. ---
    {
      id: 'fab_weapon_repeater',
      name: 'Arc Repeater',
      description: 'Almost no weight behind each shot, and it never stops making them.',
      levelRequired: 60,
      duration: 9,
      inputs: [
        { item: 'avionics_board', qty: 4 },
        { item: 'alumide_sheet', qty: 2 },
        { item: 'charged_cell', qty: 2 },
      ],
      outputs: [{ item: 'weapon_repeater', qty: 1 }],
      xp: 40,
    },
    {
      id: 'fab_legs_vector',
      name: 'Vector Thrusters',
      description: 'Landing gear jets, re-aimed. The ground becomes a suggestion.',
      levelRequired: 75,
      duration: 10,
      inputs: [
        { item: 'turbine_blade', qty: 2 },
        { item: 'alumide_sheet', qty: 3 },
        { item: 'guidance_module', qty: 1 },
      ],
      outputs: [{ item: 'legs_vector', qty: 1 }],
      xp: 63,
    },
    {
      id: 'fab_frame_aeroshell',
      name: 'Aeroshell Frame',
      description: 'You give up most of your armour. In exchange, far less of what is aimed at you arrives.',
      levelRequired: 90,
      duration: 12,
      inputs: [
        { item: 'alumide_sheet', qty: 6 },
        { item: 'guidance_module', qty: 2 },
        { item: 'beacon_core', qty: 1 },
      ],
      outputs: [{ item: 'frame_aeroshell', qty: 1 }],
      xp: 108,
    },

    // --- Bridge Checkpoint: the armour question and its answer. ---
    {
      id: 'fab_weapon_lance',
      name: 'Breaching Lance',
      description: 'Everything about it is aimed at the join rather than the plate.',
      levelRequired: 75,
      duration: 10,
      inputs: [
        { item: 'hardened_lattice', qty: 3 },
        { item: 'security_core', qty: 2 },
        { item: 'titanium_plate', qty: 4 },
      ],
      outputs: [{ item: 'weapon_lance', qty: 1 }],
      xp: 63,
    },
    {
      id: 'fab_frame_bulwark',
      name: 'Bulwark Frame',
      description: 'You will not dodge anything again. You will not especially need to.',
      levelRequired: 90,
      duration: 12,
      inputs: [
        { item: 'ablative_ceramic', qty: 6 },
        { item: 'hardened_lattice', qty: 2 },
        { item: 'crossing_writ', qty: 1 },
      ],
      outputs: [{ item: 'frame_bulwark', qty: 1 }],
      xp: 108,
    },

    // --- The City: kit for fighting numbers rather than weight. ---
    {
      id: 'fab_reactor_grid',
      name: 'Grid Tap',
      description: 'You stop carrying your own power. The city has plenty and is not counting.',
      levelRequired: 60,
      duration: 9,
      inputs: [
        { item: 'conduit_spool', qty: 5 },
        { item: 'sintered_polymer', qty: 2 },
        { item: 'charged_cell', qty: 2 },
      ],
      outputs: [{ item: 'reactor_grid', qty: 1 }],
      xp: 40,
    },
    {
      id: 'fab_weapon_disperser',
      name: 'Crowd Disperser',
      description: 'Made for moving a queue along. You will use it for that, more or less.',
      levelRequired: 75,
      duration: 10,
      inputs: [
        { item: 'sintered_polymer', qty: 4 },
        { item: 'conduit_spool', qty: 6 },
        { item: 'lens_array', qty: 1 },
      ],
      outputs: [{ item: 'weapon_disperser', qty: 1 }],
      xp: 63,
    },
    {
      id: 'fab_arms_labour',
      name: 'Labour Manipulators',
      description: 'You fit them, and something in them still knows the work. You let it.',
      levelRequired: 90,
      duration: 12,
      inputs: [
        { item: 'command_relay', qty: 2 },
        { item: 'sintered_polymer', qty: 5 },
        { item: 'census_ledger', qty: 1 },
      ],
      outputs: [{ item: 'arms_labour', qty: 1 }],
      xp: 108,
    },

    // --- The last two things you will build. ---
    {
      id: 'fab_weapon_sentence',
      name: 'The Sentence',
      description: 'Through the armour, and nothing wasted after. You needed both, so you built both.',
      levelRequired: 90,
      duration: 12,
      inputs: [
        { item: 'field_alloy', qty: 4 },
        { item: 'hardened_lattice', qty: 3 },
        { item: 'munitions_case', qty: 6 },
      ],
      outputs: [{ item: 'weapon_sentence', qty: 1 }],
      xp: 108,
    },
    {
      id: 'fab_frame_command',
      name: 'Command Frame',
      description: 'It fits without adjustment. You do not think about why for as long as you can manage.',
      levelRequired: 90,
      duration: 14,
      inputs: [
        { item: 'field_alloy', qty: 6 },
        { item: 'continuity_core', qty: 1 },
        { item: 'ablative_ceramic', qty: 4 },
      ],
      outputs: [{ item: 'frame_command', qty: 1 }],
      xp: 108,
    },
  ],
}
