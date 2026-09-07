import type { SkillDef } from '../types'

/**
 * Scavenging - the first subroutine to come back online.
 *
 * Pure gathering: no inputs, and everything else in the economy starts here.
 *
 * Eight tiers, unlocking at levels 1/10/20/30/45/60/75/90. Those thresholds are not
 * arbitrary - they land at roughly 0h, 0.3h, 1h, 2.5h, 8h, 26h, 84h and 266h of play,
 * so new content keeps arriving all the way to 99 instead of running out early. Rates
 * follow 1.0 xp/s at tier 1, growing ~1.4x per tier. See the pacing test.
 */
export const SCAVENGING: SkillDef = {
  id: 'scavenging',
  name: 'Scavenging',
  description:
    'Optical survey and grasping protocols. You knew how to take things apart before you knew what you were.',
  actions: [
    {
      id: 'roadside_wrecks',
      name: 'Roadside Wrecks',
      description: 'Vehicles that stopped where they stood. Nothing here is guarded.',
      levelRequired: 1,
      duration: 3,
      outputs: [{ item: 'scrap_steel', qty: 1 }],
      xp: 3,
    },
    {
      id: 'collapsed_overpass',
      name: 'Collapsed Overpass',
      description: 'Rebar and conduit, layered like sediment.',
      levelRequired: 10,
      duration: 4,
      outputs: [{ item: 'scrap_steel', qty: 2 }],
      drops: [{ item: 'copper_wiring', qty: 1, chance: 0.4 }],
      xp: 5,
    },
    {
      id: 'drone_graveyard',
      name: 'Drone Graveyard',
      description: 'They came down in formation and were never collected.',
      levelRequired: 20,
      duration: 4,
      outputs: [
        { item: 'scrap_steel', qty: 2 },
        { item: 'copper_wiring', qty: 1 },
      ],
      drops: [{ item: 'intact_servo', qty: 1, chance: 0.08 }],
      xp: 7,
    },
    {
      id: 'reactor_slag',
      name: 'Reactor Slag Fields',
      description: 'Still ticking. Your armour does not mind; little else would.',
      levelRequired: 30,
      duration: 5,
      outputs: [
        { item: 'scrap_steel', qty: 3 },
        { item: 'titanium_shard', qty: 1 },
      ],
      drops: [{ item: 'power_cell', qty: 1, chance: 0.12 }],
      xp: 12,
    },
    {
      id: 'freight_yard',
      name: 'Sunken Freight Yard',
      description: 'Containers stacked six high, half of them underwater. Sealed things keep well down there.',
      levelRequired: 45,
      duration: 5,
      outputs: [
        { item: 'titanium_shard', qty: 2 },
        { item: 'copper_wiring', qty: 2 },
      ],
      drops: [{ item: 'sealed_bearing', qty: 1, chance: 0.2 }],
      xp: 16,
    },
    {
      id: 'plant_ruins',
      name: 'Fabrication Plant Ruins',
      description: 'A factory that built machines like you. The line is still halfway through an order.',
      levelRequired: 60,
      duration: 6,
      outputs: [
        { item: 'titanium_shard', qty: 3 },
        { item: 'sealed_bearing', qty: 1 },
      ],
      drops: [
        { item: 'optic_lens', qty: 1, chance: 0.25 },
        { item: 'intact_servo', qty: 2, chance: 0.15 },
      ],
      xp: 27,
    },
    {
      id: 'debris_field',
      name: 'Orbital Debris Field',
      description: 'Everything in the sky came down eventually. This is where most of it landed.',
      levelRequired: 75,
      duration: 6,
      outputs: [
        { item: 'carbon_weave', qty: 2 },
        { item: 'optic_lens', qty: 1 },
      ],
      drops: [{ item: 'fused_core', qty: 1, chance: 0.1 }],
      xp: 38,
    },
    {
      id: 'vitrified_zone',
      name: 'The Vitrified Zone',
      description: 'The ground here turned to glass and stayed that way. Nothing has moved in it since.',
      levelRequired: 90,
      duration: 7,
      outputs: [
        { item: 'carbon_weave', qty: 3 },
        { item: 'fused_core', qty: 1 },
      ],
      drops: [{ item: 'optic_lens', qty: 2, chance: 0.3 }],
      xp: 63,
    },

    // --- Ship Graveyard. Same levels and rates as the Rustbelt tiers above; the
    // difference is what comes out, not how fast. ---
    {
      id: 'beached_hulls',
      name: 'Beached Hulls',
      description: 'Driven up the mud when the water went. They have been settling ever since.',
      levelRequired: 30,
      duration: 5,
      outputs: [{ item: 'hull_plate', qty: 2 }],
      drops: [{ item: 'scrap_steel', qty: 3, chance: 0.4 }],
      xp: 12,
    },
    {
      id: 'tanker_holds',
      name: 'Tanker Holds',
      description: 'Cargo nobody came back for, in a hold nobody has opened.',
      levelRequired: 45,
      duration: 5,
      outputs: [{ item: 'hull_plate', qty: 3 }],
      drops: [{ item: 'hydraulic_ram', qty: 1, chance: 0.18 }],
      xp: 16,
    },
    {
      id: 'the_drydock',
      name: 'The Drydock',
      description: 'A ship half-repaired, propped on blocks. The work order is still pinned up.',
      levelRequired: 60,
      duration: 6,
      outputs: [
        { item: 'hydraulic_ram', qty: 1 },
        { item: 'hull_plate', qty: 2 },
      ],
      drops: [{ item: 'sonar_array', qty: 1, chance: 0.22 }],
      xp: 27,
    },
    {
      id: 'deep_berths',
      name: 'Deep Berths',
      description: 'The water never fully left here. Things below the waterline kept better for it.',
      levelRequired: 75,
      duration: 6,
      outputs: [
        { item: 'sonar_array', qty: 1 },
        { item: 'hull_plate', qty: 3 },
      ],
      drops: [{ item: 'hydraulic_ram', qty: 2, chance: 0.3 }],
      xp: 38,
    },

    // --- Abandoned Airfield. Levels 45/60/75/90, matching the Rustbelt rates at each,
    // so this is a fourth material line rather than a faster route. ---
    {
      id: 'long_runway',
      name: 'The Long Runway',
      description: 'Two miles of concrete with three aircraft on it, all facing the same way, none of them going.',
      levelRequired: 45,
      duration: 5,
      outputs: [{ item: 'airframe_spar', qty: 2 }],
      drops: [{ item: 'avionics_board', qty: 1, chance: 0.16 }],
      xp: 16,
    },
    {
      id: 'terminal_c',
      name: 'Terminal C',
      description: 'The carousel is still turning. There are still bags on it. Someone keeps putting them back.',
      levelRequired: 60,
      duration: 6,
      outputs: [
        { item: 'airframe_spar', qty: 2 },
        { item: 'avionics_board', qty: 1 },
      ],
      drops: [{ item: 'copper_wiring', qty: 5, chance: 0.4 }],
      xp: 27,
    },
    {
      id: 'maintenance_hangars',
      name: 'Maintenance Hangars',
      description: 'Engines opened up on stands, tools laid out beside them in the order they would be needed.',
      levelRequired: 75,
      duration: 6,
      outputs: [
        { item: 'turbine_blade', qty: 1 },
        { item: 'airframe_spar', qty: 3 },
      ],
      drops: [{ item: 'avionics_board', qty: 2, chance: 0.3 }],
      xp: 38,
    },
    {
      id: 'the_approach',
      name: 'The Approach Lights',
      description: 'A mile of gantries out past the fence, still lit, still counting something down.',
      levelRequired: 90,
      duration: 7,
      outputs: [
        { item: 'avionics_board', qty: 3 },
        { item: 'turbine_blade', qty: 2 },
      ],
      drops: [{ item: 'airframe_spar', qty: 4, chance: 0.35 }],
      xp: 63,
    },

    // --- Bridge Checkpoint. Levels 60/75/90, matching the rates already there. ---
    {
      id: 'south_approach',
      name: 'South Approach',
      description: 'A mile of queue lanes, chicanes and dragon teeth. Nothing queued here in thirty years.',
      levelRequired: 60,
      duration: 6,
      outputs: [{ item: 'barrier_segment', qty: 2 }],
      drops: [{ item: 'ceramic_composite', qty: 1, chance: 0.3 }],
      xp: 27,
    },
    {
      id: 'the_span',
      name: 'The Span',
      description: 'Half a mile of deck over cold water, and the mainland on the far side of it.',
      levelRequired: 75,
      duration: 6,
      outputs: [
        { item: 'ceramic_composite', qty: 2 },
        { item: 'barrier_segment', qty: 1 },
      ],
      drops: [{ item: 'security_core', qty: 1, chance: 0.15 }],
      xp: 38,
    },
    {
      id: 'north_gatehouse',
      name: 'North Gatehouse',
      description: 'The last structure on the island. Everything in it is still facing the way you came from.',
      levelRequired: 90,
      duration: 7,
      outputs: [
        { item: 'ceramic_composite', qty: 3 },
        { item: 'security_core', qty: 1 },
      ],
      drops: [{ item: 'barrier_segment', qty: 4, chance: 0.35 }],
      xp: 63,
    },
  ],
}
