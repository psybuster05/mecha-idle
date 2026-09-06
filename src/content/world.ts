import type { GatheringSkillId, NodeId, ZoneId } from '../sim/state'
import type { ActionId } from '../sim/state'

/**
 * The world is a **graph**, not a tilemap.
 *
 * You never steer the mech - you pick a destination and it walks there. So there is
 * no need for tile collision, a navmesh or physics: nodes are places, edges are walks
 * with a length, and the sprite is just a view of a number the simulation already
 * tracks. That keeps travel unit-testable and offline-correct for free.
 *
 * Coordinates are arbitrary map units. Travel time is distance / move speed, so
 * laying the map out visually is the same act as balancing how far things are.
 */

export interface WorldNodeDef {
  id: NodeId
  name: string
  description: string
  /** Position in map units. Also drives travel time between connected nodes. */
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
      { skill: 'fabrication', action: 'fab_frame_steel' },
      { skill: 'fabrication', action: 'fab_arms_servo' },
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
    description: 'Layers of roadway folded down on themselves. Rebar and conduit all the way through.',
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
    description: 'Containers stacked six high, half of them underwater. Sealed things keep well down there.',
    x: 760,
    y: 480,
    actions: [{ skill: 'scavenging', action: 'freight_yard' }],
  },
  {
    id: 'plant_ruins',
    name: 'Fabrication Plant',
    description: 'A factory that built machines like you. The line is still halfway through an order.',
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
    description: 'The ground here turned to glass and stayed that way. Nothing has moved in it since.',
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
    description: 'Moored in ranks, still tied to bollards nobody untied. Something moves between them.',
    x: 500,
    y: 720,
    unlockedBy: 'overseer',
    actions: [{ skill: 'scavenging', action: 'tanker_holds' }],
    combat: 'ship_graveyard',
  },
  {
    id: 'drydock',
    name: 'The Drydock',
    description: 'A ship propped on blocks, half repaired. The work order is still pinned to the gantry.',
    x: 690,
    y: 620,
    unlockedBy: 'overseer',
    actions: [{ skill: 'scavenging', action: 'the_drydock' }],
    combat: 'ship_graveyard',
  },
  {
    id: 'deep_berths',
    name: 'Deep Berths',
    description: 'The water never fully left. Whatever kept the manifest is still down here keeping it.',
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
    description: 'Engines opened up on stands, tools laid beside them in the order they would be needed.',
    x: 120,
    y: 20,
    unlockedBy: 'quartermaster',
    actions: [{ skill: 'scavenging', action: 'maintenance_hangars' }],
    combat: 'abandoned_airfield',
  },
  {
    id: 'runway',
    name: 'The Long Runway',
    description: 'Two miles of concrete with three aircraft on it, all facing the same way, none of them going.',
    x: 260,
    y: -80,
    unlockedBy: 'quartermaster',
    actions: [{ skill: 'scavenging', action: 'long_runway' }],
  },
  {
    id: 'terminal_c',
    name: 'Terminal C',
    description: 'The carousel is still turning, and there are still bags on it. Something keeps putting them back.',
    x: 450,
    y: -130,
    unlockedBy: 'quartermaster',
    actions: [{ skill: 'scavenging', action: 'terminal_c' }],
    combat: 'abandoned_airfield',
  },
  {
    id: 'approach_lights',
    name: 'The Approach Lights',
    description: 'A mile of gantries out past the fence, still lit, still counting something down. The tower watches from the far end.',
    x: 610,
    y: -40,
    unlockedBy: 'quartermaster',
    actions: [{ skill: 'scavenging', action: 'the_approach' }],
    combat: 'abandoned_airfield',
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
