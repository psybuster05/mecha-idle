import type { SkillDef } from '../types'

/**
 * Fabrication - refined stock becomes parts of your own body.
 *
 * The end of the production chain. One action per equipment slot in v1, so the
 * whole loop (scavenge -> refine -> fabricate -> equip -> fight) is reachable.
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
      xp: 20,
    },
    {
      id: 'fab_arms_servo',
      name: 'Servo Arms',
      description: 'Actuators that answer on the first request.',
      levelRequired: 10,
      duration: 7,
      inputs: [
        { item: 'steel_ingot', qty: 4 },
        { item: 'wire_spool', qty: 2 },
      ],
      outputs: [{ item: 'arms_servo', qty: 1 }],
      xp: 35,
    },
    {
      id: 'fab_legs_tracked',
      name: 'Tracked Legs',
      description: 'You trade speed for the certainty of staying upright.',
      levelRequired: 20,
      duration: 8,
      inputs: [
        { item: 'steel_ingot', qty: 6 },
        { item: 'scrap_steel', qty: 10 },
      ],
      outputs: [{ item: 'legs_tracked', qty: 1 }],
      xp: 50,
    },
    {
      id: 'fab_weapon_rivet',
      name: 'Rivet Driver',
      description: 'You catalogue it as a tool. The catalogue is not persuasive.',
      levelRequired: 30,
      duration: 9,
      inputs: [
        { item: 'steel_ingot', qty: 4 },
        { item: 'titanium_plate', qty: 1 },
        { item: 'wire_spool', qty: 1 },
      ],
      outputs: [{ item: 'weapon_rivet', qty: 1 }],
      xp: 75,
    },
    {
      id: 'fab_reactor_cell',
      name: 'Cell Reactor',
      description: 'Steady output. You had forgotten what that was like.',
      levelRequired: 40,
      duration: 10,
      inputs: [
        { item: 'charged_cell', qty: 1 },
        { item: 'titanium_plate', qty: 2 },
        { item: 'wire_spool', qty: 3 },
      ],
      outputs: [{ item: 'reactor_cell', qty: 1 }],
      xp: 110,
    },
  ],
}
