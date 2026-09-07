import type { GatheringSkillId, NodeId, ZoneId } from '../sim/state'
import type { ActionId } from '../sim/state'

/**
 * The world is a **graph**, not a tilemap.
 *
 * Nodes are places, edges say which places touch. There is no tile collision, no
 * navmesh and no physics, because there is nothing to collide with: getting anywhere is
 * instant. Travel was built here and then deleted - a walk you cannot watch is a cost
 * with no feedback - and the graph survived it, because a place is still what a boss
 * lock hangs from and an edge is still what makes the map legible.
 *
 * Coordinates are arbitrary map units, used only for drawing. Edge lengths are likewise
 * only a record of how the map is laid out; nothing reads them as a cost any more.
 */

export interface WorldNodeDef {
  id: NodeId
  name: string
  description: string
  /** Position in map units, for drawing. */
  x: number
  y: number
  /** Skill actions performable here. */
  actions?: { skill: GatheringSkillId; action: ActionId }[]
  /** Combat zone reachable from here, if any. */
  combat?: ZoneId
  /** Where the crawler is parked. Industry happens here. */
  isCamp?: boolean
  /**
   * Boss that must be defeated before this place can be entered.
   *
   * Locked regions **may** hold gathering content - the Ship Graveyard does. What they
   * must never be is *required*: a complete 1-99 ladder has to remain available outside
   * every lock, and locked actions must never beat what is already open at their level.
   * Both are measured by tests in content/__tests__/pacing.test.ts, which recompute the
   * whole curve using unlocked actions only.
   */
  unlockedBy?: string
}

/** An undirected walk between two nodes. Length comes from their coordinates. */
export interface WorldEdgeDef {
  a: NodeId
  b: NodeId
  /**
   * Multiplier on the straight-line distance. Rough ground costs more without
   * needing a separate distance number to keep in sync with the layout.
   */
  difficulty?: number
}

export const WORLD_NODES: readonly WorldNodeDef[] = [
  {
    id: 'the_hollow',
    name: 'The Hollow',
    description:
      'A collapsed service tunnel, dry and out of the wind. The crawler fits, barely. It is the closest thing you have to a place.',
    x: 300,
    y: 260,
    isCamp: true,
    // All industry happens at the camp. Every Refining and Fabrication action must be
    // listed here or it is unreachable - starting one halts immediately. A test in
    // world.test.ts catches omissions, which is how the tier 5-8 recipes were found
    // stranded after the rebalance.
    actions: [
      { skill: 'refining', action: 'smelt_steel' },
      { skill: 'refining', action: 'draw_wire' },
      { skill: 'refining', action: 'cast_titanium' },
      { skill: 'refining', action: 'charge_cell' },
      { skill: 'refining', action: 'true_bearings' },
      { skill: 'refining', action: 'grind_lenses' },
      { skill: 'refining', action: 'press_weave' },
      { skill: 'refining', action: 'reforge_core' },
      { skill: 'refining', action: 'temper_marine' },
      { skill: 'refining', action: 'seat_seal' },
      { skill: 'refining', action: 'roll_alumide' },
      { skill: 'refining', action: 'sync_guidance' },
      { skill: 'refining', action: 'fire_ceramic' },
      { skill: 'refining', action: 'draw_lattice' },
      { skill: 'refining', action: 'sinter_polymer' },
      { skill: 'refining', action: 'invert_collar' },
      { skill: 'refining', action: 'mix_field_alloy' },
      { skill: 'salvaging', action: 'strip_steel_frame' },
      { skill: 'salvaging', action: 'strip_servo_arms' },
      { skill: 'salvaging', action: 'strip_tracked_legs' },
      { skill: 'salvaging', action: 'strip_rivet_driver' },
      { skill: 'salvaging', action: 'strip_cell_reactor' },
      { skill: 'salvaging', action: 'strip_titanium_frame' },
      { skill: 'salvaging', action: 'strip_marine_frame' },
      { skill: 'salvaging', action: 'strip_aeroshell' },
      { skill: 'cartography', action: 'pace_the_hollow' },
      { skill: 'cartography', action: 'chart_roadways' },
      { skill: 'cartography', action: 'triangulate_ruins' },
      { skill: 'cartography', action: 'survey_slag' },
      { skill: 'cartography', action: 'plot_coast' },
      { skill: 'cartography', action: 'log_approaches' },
      { skill: 'cartography', action: 'map_mainland' },
      { skill: 'cartography', action: 'fix_the_grid' },
      { skill: 'fabrication', action: 'fab_frame_steel' },
      { skill: 'fabrication', action: 'fab_arms_servo' },
      { skill: 'fabrication', action: 'fab_crawler_core' },
      { skill: 'fabrication', action: 'fab_legs_tracked' },
      { skill: 'fabrication', action: 'fab_weapon_rivet' },
      { skill: 'fabrication', action: 'fab_reactor_cell' },
      { skill: 'fabrication', action: 'fab_weapon_arc' },
      { skill: 'fabrication', action: 'fab_weapon_pulse' },
      { skill: 'fabrication', action: 'fab_frame_titanium' },
      { skill: 'fabrication', action: 'fab_arms_precision' },
      { skill: 'fabrication', action: 'fab_legs_thruster' },
      { skill: 'fabrication', action: 'fab_weapon_harpoon' },
      { skill: 'fabrication', action: 'fab_frame_marine' },
      { skill: 'fabrication', action: 'fab_weapon_repeater' },
      { skill: 'fabrication', action: 'fab_legs_vector' },
      { skill: 'fabrication', action: 'fab_frame_aeroshell' },
      { skill: 'fabrication', action: 'fab_weapon_lance' },
      { skill: 'fabrication', action: 'fab_frame_bulwark' },
      { skill: 'fabrication', action: 'fab_reactor_grid' },
      { skill: 'fabrication', action: 'fab_weapon_disperser' },
      { skill: 'fabrication', action: 'fab_arms_labour' },
      { skill: 'fabrication', action: 'fab_weapon_sentence' },
      { skill: 'fabrication', action: 'fab_frame_command' },
    ],
  },
  {
    id: 'roadside',
    name: 'Roadside Wrecks',
    description: 'The old evacuation route. Everything on it stopped at the same moment.',
    x: 140,
    y: 180,
    actions: [{ skill: 'scavenging', action: 'roadside_wrecks' }],
  },
  {
    id: 'overpass',
    name: 'Collapsed Overpass',
    description:
      'Layers of roadway folded down on themselves. Rebar and conduit all the way through.',
    x: 175,
    y: 400,
    actions: [{ skill: 'scavenging', action: 'collapsed_overpass' }],
  },
  {
    id: 'graveyard',
    name: 'Drone Graveyard',
    description: 'They came down in formation. Some of them are still trying to hold it.',
    x: 480,
    y: 150,
    actions: [{ skill: 'scavenging', action: 'drone_graveyard' }],
    combat: 'rustbelt',
  },
  {
    id: 'slag_fields',
    name: 'Reactor Slag Fields',
    description: 'Still warm after all this time. Your plating does not mind. Little else would.',
    x: 600,
    y: 400,
    actions: [{ skill: 'scavenging', action: 'reactor_slag' }],
  },
  {
    id: 'checkpoint',
    name: 'Rustbelt Checkpoint',
    description: 'A security post that never stood down. The machines here still ask for papers.',
    x: 470,
    y: 300,
    combat: 'rustbelt',
  },

  // Later tiers sit progressively further out, so walking speed matters more the
  // deeper you get - which is what makes Thruster Legs feel like a reward.
  {
    id: 'freight_yard',
    name: 'Sunken Freight Yard',
    description:
      'Containers stacked six high, half of them underwater. Sealed things keep well down there.',
    x: 760,
    y: 480,
    actions: [{ skill: 'scavenging', action: 'freight_yard' }],
  },
  {
    id: 'plant_ruins',
    name: 'Fabrication Plant',
    description:
      'A factory that built machines like you. The line is still halfway through an order.',
    x: 820,
    y: 200,
    actions: [{ skill: 'scavenging', action: 'plant_ruins' }],
  },
  {
    id: 'debris_field',
    name: 'Orbital Debris Field',
    description: 'Everything in the sky came down eventually. This is where most of it landed.',
    x: 700,
    y: 60,
    actions: [{ skill: 'scavenging', action: 'debris_field' }],
  },
  {
    id: 'vitrified_zone',
    name: 'The Vitrified Zone',
    description:
      'The ground here turned to glass and stayed that way. Nothing has moved in it since.',
    x: 980,
    y: 330,
    actions: [{ skill: 'scavenging', action: 'vitrified_zone' }],
  },

  // --- The Ship Graveyard, south along the old coast -----------------------
  //
  // The whole region is locked behind the Overseer. That is allowed because the
  // Rustbelt already carries a complete 1-99 ladder for every skill: locked content
  // may exist, it just may never be *required* to max anything. A pacing test checks
  // that the open-world ladder still reaches 99 on its own.
  {
    id: 'shallows',
    name: 'The Shallows',
    description: 'Mudflats where the water pulled back. Hulls stand in it like a row of teeth.',
    x: 300,
    y: 640,
    unlockedBy: 'overseer',
    actions: [{ skill: 'scavenging', action: 'beached_hulls' }],
  },
  {
    id: 'tanker_rows',
    name: 'Tanker Rows',
    description:
      'Moored in ranks, still tied to bollards nobody untied. Something moves between them.',
    x: 500,
    y: 720,
    unlockedBy: 'overseer',
    actions: [{ skill: 'scavenging', action: 'tanker_holds' }],
    combat: 'ship_graveyard',
  },
  {
    id: 'drydock',
    name: 'The Drydock',
    description:
      'A ship propped on blocks, half repaired. The work order is still pinned to the gantry.',
    x: 690,
    y: 620,
    unlockedBy: 'overseer',
    actions: [{ skill: 'scavenging', action: 'the_drydock' }],
    combat: 'ship_graveyard',
  },
  {
    id: 'deep_berths',
    name: 'Deep Berths',
    description:
      'The water never fully left. Whatever kept the manifest is still down here keeping it.',
    x: 760,
    y: 790,
    unlockedBy: 'overseer',
    actions: [{ skill: 'scavenging', action: 'deep_berths' }],
    combat: 'ship_graveyard',
  },

  // --- The Abandoned Airfield, north-west past the ring road -----------------
  //
  // Locked behind the Quartermaster, so the regions chain: Rustbelt is open, the
  // Overseer opens the coast, the Quartermaster opens the airfield.
  {
    id: 'hangars',
    name: 'Maintenance Hangars',
    description:
      'Engines opened up on stands, tools laid beside them in the order they would be needed.',
    x: 120,
    y: 20,
    unlockedBy: 'quartermaster',
    actions: [{ skill: 'scavenging', action: 'maintenance_hangars' }],
    combat: 'abandoned_airfield',
  },
  {
    id: 'runway',
    name: 'The Long Runway',
    description:
      'Two miles of concrete with three aircraft on it, all facing the same way, none of them going.',
    x: 260,
    y: -80,
    unlockedBy: 'quartermaster',
    actions: [{ skill: 'scavenging', action: 'long_runway' }],
  },
  {
    id: 'terminal_c',
    name: 'Terminal C',
    description:
      'The carousel is still turning, and there are still bags on it. Something keeps putting them back.',
    x: 450,
    y: -130,
    unlockedBy: 'quartermaster',
    actions: [{ skill: 'scavenging', action: 'terminal_c' }],
    combat: 'abandoned_airfield',
  },
  {
    id: 'approach_lights',
    name: 'The Approach Lights',
    description:
      'A mile of gantries out past the fence, still lit, still counting something down. The tower watches from the far end.',
    x: 610,
    y: -40,
    unlockedBy: 'quartermaster',
    actions: [{ skill: 'scavenging', action: 'the_approach' }],
    combat: 'abandoned_airfield',
  },

  // --- The Bridge Checkpoint, east: the way off the island -------------------
  //
  // Only three places, in a line. This is a crossing rather than a region, and its
  // boss is the gate to the mainland. Locked behind Tower Actual, continuing the chain.
  {
    id: 'south_approach',
    name: 'South Approach',
    description: 'A mile of queue lanes, chicanes and dragon teeth, all of it facing inland.',
    x: 1120,
    y: 470,
    unlockedBy: 'tower_actual',
    actions: [{ skill: 'scavenging', action: 'south_approach' }],
    combat: 'bridge_checkpoint',
  },
  {
    id: 'the_span',
    name: 'The Span',
    description:
      'Half a mile of deck over cold water. You can see the mainland from the middle of it.',
    x: 1290,
    y: 380,
    unlockedBy: 'tower_actual',
    actions: [{ skill: 'scavenging', action: 'the_span' }],
    combat: 'bridge_checkpoint',
  },
  {
    id: 'north_gatehouse',
    name: 'North Gatehouse',
    description:
      'The last structure on the island. Everything in it is still facing the way you came from.',
    x: 1440,
    y: 290,
    unlockedBy: 'tower_actual',
    actions: [{ skill: 'scavenging', action: 'north_gatehouse' }],
    combat: 'bridge_checkpoint',
  },

  // --- The City, on the mainland past the bridge ----------------------------
  //
  // Locked behind the Registrar, so crossing the bridge is what opens the mainland.
  {
    id: 'outer_wards',
    name: 'Outer Wards',
    description:
      'Housing blocks for units that do not sleep, maintained to a standard nobody inspects.',
    x: 1600,
    y: 200,
    unlockedBy: 'registrar',
    actions: [{ skill: 'scavenging', action: 'outer_wards' }],
    combat: 'the_city',
  },
  {
    id: 'the_works',
    name: 'The Works',
    description:
      'Three shifts, no breaks, and no output anyone collects. They build spares for spares.',
    x: 1760,
    y: 330,
    unlockedBy: 'registrar',
    actions: [{ skill: 'scavenging', action: 'the_works' }],
    combat: 'the_city',
  },
  {
    id: 'transit_rings',
    name: 'Transit Rings',
    description: 'Trains running to timetable, full of nothing, stopping where nothing waits.',
    x: 1840,
    y: 140,
    unlockedBy: 'registrar',
    actions: [{ skill: 'scavenging', action: 'transit_rings' }],
    combat: 'the_city',
  },
  {
    id: 'census_hall',
    name: 'The Census Hall',
    description:
      'The only building in the city with nothing in it but a count, and the thing that keeps it.',
    x: 1980,
    y: 260,
    unlockedBy: 'registrar',
    combat: 'the_city',
  },

  // --- The Base, inland past the city --------------------------------------
  {
    id: 'supply_yards',
    name: 'Supply Yards',
    description:
      'Rows of it under cover, rotated on schedule. Enough to have equipped the island twice, and none of it ever sent.',
    x: 2140,
    y: 380,
    unlockedBy: 'census',
    actions: [{ skill: 'scavenging', action: 'supply_yards' }],
    combat: 'the_base',
  },
  {
    id: 'parade_ground',
    name: 'Parade Ground',
    description:
      'Swept every morning. They still form up on it for an inspection nobody has come to give.',
    x: 2300,
    y: 250,
    unlockedBy: 'census',
    actions: [{ skill: 'scavenging', action: 'parade_ground' }],
    combat: 'the_base',
  },
  {
    id: 'command_annex',
    name: 'Command Annex',
    description:
      'Where the postings are kept. One of them has been open for thirty-one years and has never been marked lapsed.',
    x: 2260,
    y: 500,
    unlockedBy: 'census',
    combat: 'the_base',
  },

  // --- The Lair ------------------------------------------------------------
  {
    id: 'the_gallery',
    name: 'The Long Gallery',
    description:
      'A corridor of empty stations, each with a chair, each facing a console left logged in.',
    x: 2480,
    y: 360,
    unlockedBy: 'adjutant',
    actions: [{ skill: 'scavenging', action: 'the_gallery' }],
    combat: 'the_lair',
  },
  {
    id: 'switch_room',
    name: 'The Switch Room',
    description:
      'The only room on the mainland that never lost power. He is in it. He has been in it the entire time.',
    x: 2640,
    y: 300,
    unlockedBy: 'adjutant',
    combat: 'the_lair',
  },
] as const

export const WORLD_EDGES: readonly WorldEdgeDef[] = [
  { a: 'the_hollow', b: 'roadside' },
  { a: 'the_hollow', b: 'overpass' },
  { a: 'the_hollow', b: 'checkpoint' },
  { a: 'roadside', b: 'graveyard', difficulty: 1.2 },
  { a: 'checkpoint', b: 'graveyard' },
  { a: 'checkpoint', b: 'slag_fields', difficulty: 1.4 },
  { a: 'overpass', b: 'slag_fields', difficulty: 1.6 },

  // The far reaches. Rougher ground as well as longer distances.
  { a: 'slag_fields', b: 'freight_yard', difficulty: 1.3 },
  { a: 'graveyard', b: 'plant_ruins', difficulty: 1.4 },
  { a: 'freight_yard', b: 'plant_ruins', difficulty: 1.5 },
  { a: 'plant_ruins', b: 'debris_field', difficulty: 1.6 },
  { a: 'plant_ruins', b: 'vitrified_zone', difficulty: 1.8 },
  { a: 'debris_field', b: 'vitrified_zone', difficulty: 1.8 },

  // Down to the coast. Two ways in, so losing one route does not strand the region.
  { a: 'overpass', b: 'shallows', difficulty: 1.5 },
  { a: 'freight_yard', b: 'drydock', difficulty: 1.4 },
  { a: 'shallows', b: 'tanker_rows', difficulty: 1.2 },
  { a: 'tanker_rows', b: 'drydock', difficulty: 1.2 },
  { a: 'tanker_rows', b: 'deep_berths', difficulty: 1.4 },
  { a: 'drydock', b: 'deep_berths', difficulty: 1.3 },

  // North-west to the airfield. Two ways in again.
  { a: 'roadside', b: 'hangars', difficulty: 1.3 },
  { a: 'graveyard', b: 'terminal_c', difficulty: 1.4 },
  { a: 'hangars', b: 'runway', difficulty: 1.1 },
  { a: 'runway', b: 'terminal_c', difficulty: 1.2 },
  { a: 'terminal_c', b: 'approach_lights', difficulty: 1.2 },
  { a: 'runway', b: 'approach_lights', difficulty: 1.5 },

  // East to the bridge. One road in, as a checkpoint should have.
  { a: 'vitrified_zone', b: 'south_approach', difficulty: 1.3 },
  { a: 'south_approach', b: 'the_span', difficulty: 1.1 },
  { a: 'the_span', b: 'north_gatehouse', difficulty: 1.1 },

  // Onto the mainland. The city is dense, so moving inside it is quick.
  { a: 'north_gatehouse', b: 'outer_wards', difficulty: 1.2 },
  { a: 'outer_wards', b: 'the_works', difficulty: 0.9 },
  { a: 'outer_wards', b: 'transit_rings', difficulty: 0.9 },
  { a: 'the_works', b: 'census_hall', difficulty: 0.9 },
  { a: 'transit_rings', b: 'census_hall', difficulty: 0.9 },

  // Inland to the base, and then the last stretch.
  { a: 'census_hall', b: 'supply_yards', difficulty: 1.3 },
  { a: 'supply_yards', b: 'parade_ground', difficulty: 1 },
  { a: 'supply_yards', b: 'command_annex', difficulty: 1 },
  { a: 'parade_ground', b: 'command_annex', difficulty: 1 },
  { a: 'command_annex', b: 'the_gallery', difficulty: 1.2 },
  { a: 'the_gallery', b: 'switch_room', difficulty: 1.1 },
] as const

const nodesById = new Map<NodeId, WorldNodeDef>(WORLD_NODES.map((n) => [n.id, n]))

export function getNode(id: NodeId): WorldNodeDef | undefined {
  return nodesById.get(id)
}

/** Where a new game starts. */
export const STARTING_NODE: NodeId = 'the_hollow'

/** Straight-line map units between two nodes, before difficulty. */
export function nodeDistance(a: WorldNodeDef, b: WorldNodeDef): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Adjacency, built once: node id -> [neighbour id, map-unit length]. */
export const ADJACENCY: ReadonlyMap<NodeId, readonly { to: NodeId; length: number }[]> = (() => {
  const map = new Map<NodeId, { to: NodeId; length: number }[]>()
  for (const node of WORLD_NODES) map.set(node.id, [])

  for (const edge of WORLD_EDGES) {
    const a = nodesById.get(edge.a)
    const b = nodesById.get(edge.b)
    if (!a || !b) continue
    const length = nodeDistance(a, b) * (edge.difficulty ?? 1)
    map.get(edge.a)?.push({ to: edge.b, length })
    map.get(edge.b)?.push({ to: edge.a, length })
  }
  return map
})()

/** Every node where `skill:action` can be performed. */
export function nodesForAction(skill: GatheringSkillId, action: ActionId): WorldNodeDef[] {
  return WORLD_NODES.filter((node) =>
    node.actions?.some((a) => a.skill === skill && a.action === action),
  )
}

/** Every node from which `zone` can be fought. */
export function nodesForZone(zone: ZoneId): WorldNodeDef[] {
  return WORLD_NODES.filter((node) => node.combat === zone)
}

/**
 * What a player can see of the world: everywhere open, plus its immediate frontier.
 *
 * Twenty-four places drawn at once is unreadable on the map and a wall of locks in a
 * list. Showing only the locked places one step beyond where you can already go keeps
 * both legible, preserves the "there is more out there" hook, and makes the world
 * visibly grow each time a boss falls.
 *
 * Lives here rather than in the map because the World panel's list has to agree with
 * what is drawn above it - two different answers to "where is there" would read as a bug.
 */
export function visibleNodes(isOpen: (id: NodeId) => boolean): WorldNodeDef[] {
  const frontier = new Set<string>()
  for (const node of WORLD_NODES) {
    if (!isOpen(node.id)) continue
    for (const edge of ADJACENCY.get(node.id) ?? []) frontier.add(edge.to)
  }
  return WORLD_NODES.filter((node) => isOpen(node.id) || frontier.has(node.id))
}
