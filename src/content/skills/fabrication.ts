import type { SkillDef } from '../types'

/**
 * Fabrication - refined stock becomes parts of your own body.
 *
 * The end of the production chain, and where the speed-up upgrades live: Arms grant
 * skillSpeed, Legs grant moveSpeed. Building better ones is how you buy back time.
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
  ],
}
