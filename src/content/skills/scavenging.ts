import type { SkillDef } from '../types'

/**
 * Scavenging - the first subroutine to come back online.
 *
 * Pure gathering: no inputs, everything else in the economy starts here.
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
      xp: 5,
    },
    {
      id: 'collapsed_overpass',
      name: 'Collapsed Overpass',
      description: 'Rebar and conduit, layered like sediment.',
      levelRequired: 10,
      duration: 4,
      outputs: [{ item: 'scrap_steel', qty: 2 }],
      drops: [{ item: 'copper_wiring', qty: 1, chance: 0.4 }],
      xp: 12,
    },
    {
      id: 'drone_graveyard',
      name: 'Drone Graveyard',
      description: 'They came down in formation and were never collected.',
      levelRequired: 25,
      duration: 5,
      outputs: [
        { item: 'scrap_steel', qty: 2 },
        { item: 'copper_wiring', qty: 1 },
      ],
      drops: [{ item: 'intact_servo', qty: 1, chance: 0.08 }],
      xp: 25,
    },
    {
      id: 'reactor_slag',
      name: 'Reactor Slag Fields',
      description: 'Still ticking. Your armour does not mind; little else would.',
      levelRequired: 40,
      duration: 6,
      outputs: [
        { item: 'scrap_steel', qty: 3 },
        { item: 'titanium_shard', qty: 1 },
      ],
      drops: [{ item: 'power_cell', qty: 1, chance: 0.12 }],
      xp: 45,
    },
  ],
}
