import type { SkillDef } from '../types'

/**
 * Salvaging - taking your own old parts back apart.
 *
 * A sink for gear you have outgrown. By the endgame you are sitting on a pile of frames
 * and weapons that were state of the art two regions ago, and nothing to do with them;
 * this returns some of what went in.
 *
 * Deliberately lossy. Salvage returns roughly half of a part's inputs, so building and
 * stripping in a loop is never better than gathering - it is a way to stop wasting
 * things, not a way to farm them.
 *
 * Same eight-tier pacing as every other skill: levels 1/10/20/30/45/60/75/90 at the
 * shared rate schedule, so the one-month target holds.
 */
export const SALVAGING: SkillDef = {
  id: 'salvaging',
  name: 'Salvaging',
  description:
    'Undoing your own work. It is the same knowledge as building, run backwards, and it comes to you far more easily than it should.',
  actions: [
    {
      id: 'strip_steel_frame',
      name: 'Strip Welded Steel Frame',
      description: 'The first thing you ever built. You get about half of it back.',
      levelRequired: 1,
      duration: 3,
      inputs: [{ item: 'frame_steel', qty: 1 }],
      outputs: [{ item: 'steel_ingot', qty: 2 }],
      xp: 3,
    },
    {
      id: 'strip_servo_arms',
      name: 'Strip Servo Arms',
      description: 'The tolerances were always wrong by a millimetre. You stop minding.',
      levelRequired: 10,
      duration: 4,
      inputs: [{ item: 'arms_servo', qty: 1 }],
      outputs: [
        { item: 'steel_ingot', qty: 2 },
        { item: 'wire_spool', qty: 1 },
      ],
      xp: 5,
    },
    {
      id: 'strip_tracked_legs',
      name: 'Strip Tracked Legs',
      description: 'They kept you upright for a long time. The tracks come off in one piece.',
      levelRequired: 20,
      duration: 4,
      inputs: [{ item: 'legs_tracked', qty: 1 }],
      outputs: [
        { item: 'steel_ingot', qty: 3 },
        { item: 'scrap_steel', qty: 5 },
      ],
      xp: 7,
    },
    {
      id: 'strip_rivet_driver',
      name: 'Strip Rivet Driver',
      description: 'A construction tool again, briefly, on the way to being nothing.',
      levelRequired: 30,
      duration: 5,
      inputs: [{ item: 'weapon_rivet', qty: 1 }],
      outputs: [
        { item: 'steel_ingot', qty: 2 },
        { item: 'titanium_plate', qty: 1 },
      ],
      xp: 12,
    },
    {
      id: 'strip_cell_reactor',
      name: 'Strip Cell Reactor',
      description: 'You vent it first. You learned to vent it first the hard way.',
      levelRequired: 45,
      duration: 5,
      inputs: [{ item: 'reactor_cell', qty: 1 }],
      outputs: [
        { item: 'titanium_plate', qty: 1 },
        { item: 'wire_spool', qty: 2 },
      ],
      xp: 16,
    },
    {
      id: 'strip_titanium_frame',
      name: 'Strip Titanium Exoframe',
      description: 'It took a great deal of hitting to justify replacing this.',
      levelRequired: 60,
      duration: 6,
      inputs: [{ item: 'frame_titanium', qty: 1 }],
      outputs: [
        { item: 'titanium_plate', qty: 3 },
        { item: 'bearing_assembly', qty: 1 },
      ],
      xp: 27,
    },
    {
      id: 'strip_marine_frame',
      name: 'Strip Marine Exoframe',
      description: 'The seals give up all at once, with a sound like the sea leaving.',
      levelRequired: 75,
      duration: 6,
      inputs: [{ item: 'frame_marine', qty: 1 }],
      outputs: [
        { item: 'marine_alloy', qty: 3 },
        { item: 'pressure_seal', qty: 1 },
      ],
      xp: 38,
    },
    {
      id: 'strip_aeroshell',
      name: 'Strip Aeroshell Frame',
      description: 'Built to fly. It comes apart in your hands like it was waiting to.',
      levelRequired: 90,
      duration: 7,
      inputs: [{ item: 'frame_aeroshell', qty: 1 }],
      outputs: [
        { item: 'alumide_sheet', qty: 3 },
        { item: 'guidance_module', qty: 1 },
      ],
      xp: 63,
    },
  ],
}
