import type { NodeId } from '../../sim/state'
import type { SkillDef } from '../types'

/**
 * Cartography - knowing the ground.
 *
 * Its original job in the design was unlocking zones, but bosses do that now, and a
 * skill that gated regions would break the rule that combat widens rather than blocks.
 * So it took the job the world map created instead: **travel**.
 *
 * Twenty-four places and a long walk to the far ones makes journey time a real cost.
 * Levelling this establishes waypoints - places you can reach in a fixed short hop no
 * matter how far away they are - which is the teleport mechanic that inspired the world
 * map in the first place.
 */
export const CARTOGRAPHY: SkillDef = {
  id: 'cartography',
  name: 'Cartography',
  description:
    'Survey and route-finding. The maps you were given were thirty-one years out of date the moment you woke, so you have been making your own.',
  actions: [
    {
      id: 'pace_the_hollow',
      name: 'Pace The Hollow',
      description: 'Start with the tunnel you sleep in. It takes longer than you expect.',
      levelRequired: 1,
      duration: 3,
      outputs: [{ item: 'scrap_steel', qty: 1 }],
      xp: 3,
    },
    {
      id: 'chart_roadways',
      name: 'Chart The Roadways',
      description: 'Every route out of the district, and which of them are still routes.',
      levelRequired: 10,
      duration: 4,
      outputs: [{ item: 'copper_wiring', qty: 1 }],
      drops: [{ item: 'scrap_steel', qty: 2, chance: 0.5 }],
      xp: 5,
    },
    {
      id: 'triangulate_ruins',
      name: 'Triangulate The Ruins',
      description: 'Three fixed points and a great deal of walking between them.',
      levelRequired: 20,
      duration: 4,
      outputs: [{ item: 'copper_wiring', qty: 2 }],
      xp: 7,
    },
    {
      id: 'survey_slag',
      name: 'Survey The Slag',
      description: 'Mapping ground that is still moving is mostly a matter of going back.',
      levelRequired: 30,
      duration: 5,
      outputs: [
        { item: 'titanium_shard', qty: 1 },
        { item: 'scrap_steel', qty: 2 },
      ],
      xp: 12,
    },
    {
      id: 'plot_coast',
      name: 'Plot The Coastline',
      description: 'The charts say the water is a mile further in. You are correcting them.',
      levelRequired: 45,
      duration: 5,
      outputs: [{ item: 'hull_plate', qty: 2 }],
      xp: 16,
    },
    {
      id: 'log_approaches',
      name: 'Log The Approaches',
      description: 'Every way in and every way out, which turn out not to be the same list.',
      levelRequired: 60,
      duration: 6,
      outputs: [{ item: 'airframe_spar', qty: 2 }],
      drops: [{ item: 'avionics_board', qty: 1, chance: 0.12 }],
      xp: 27,
    },
    {
      id: 'map_mainland',
      name: 'Map The Mainland',
      description: 'A whole landmass nobody has surveyed since the switch. It takes months.',
      levelRequired: 75,
      duration: 6,
      outputs: [{ item: 'conduit_spool', qty: 2 }],
      xp: 38,
    },
    {
      id: 'fix_the_grid',
      name: 'Fix The Grid',
      description: 'Everything, tied to one reference. You can find any point on it from any other.',
      levelRequired: 90,
      duration: 7,
      outputs: [
        { item: 'command_plate', qty: 2 },
        { item: 'conduit_spool', qty: 2 },
      ],
      xp: 63,
    },
  ],
}

/**
 * Waypoints, unlocked by Cartography level.
 *
 * Reaching a waypoint takes a fixed short hop rather than the full walk, however far it
 * is. Ordered so the places that hurt most to reach open first: the camp early, then the
 * far corners of the island, then the mainland.
 *
 * Deliberately data rather than a mechanic the player triggers - there is nothing to
 * remember to do, which suits a game played in glances.
 */
export interface WaypointDef {
  node: NodeId
  level: number
}

export const WAYPOINTS: readonly WaypointDef[] = [
  { node: 'the_hollow', level: 5 },
  { node: 'checkpoint', level: 15 },
  { node: 'slag_fields', level: 30 },
  { node: 'vitrified_zone', level: 45 },
  { node: 'deep_berths', level: 55 },
  { node: 'approach_lights', level: 65 },
  { node: 'north_gatehouse', level: 75 },
  { node: 'census_hall', level: 85 },
  { node: 'switch_room', level: 95 },
] as const

/** Fixed seconds to reach a waypoint, regardless of distance. */
export const WAYPOINT_TRAVEL_SECONDS = 4
