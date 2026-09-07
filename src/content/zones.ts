import type { ZoneId } from '../sim/state'

export interface ZoneDef {
  id: ZoneId
  name: string
  description: string
  /** Enemy ids, rolled uniformly on each spawn. */
  enemies: string[]
  /** Minimum combat level (mean of the four combat skills) to deploy. */
  levelRequired: number
  /**
   * Seconds between one enemy falling and the next arriving. Defaults to RESPAWN_DELAY.
   *
   * This is how a swarm is expressed in a model that only ever fights one thing at a
   * time: not more enemies at once, but no gap between them. It also decides how much
   * cleave is worth, since a carried kill still has to wait for the next arrival.
   */
  respawnDelay?: number
}

export const ZONES: readonly ZoneDef[] = [
  {
    id: 'rustbelt',
    name: 'The Rustbelt',
    description:
      'The industrial ring, where the machines outlasted everyone who built them. Most are still working.',
    enemies: ['scrap_crawler', 'sentry_drone', 'reclaimer', 'overseer'],
    levelRequired: 1,
  },
  {
    id: 'ship_graveyard',
    name: 'The Ship Graveyard',
    description:
      'Where the coast used to be. The fleet came in when the power went and never went out again, and something aboard has been organising the wrecks.',
    enemies: ['scuttler', 'deck_gunner', 'boarding_rig', 'quartermaster'],
    levelRequired: 25,
  },
  {
    id: 'abandoned_airfield',
    name: 'The Abandoned Airfield',
    description:
      'A regional airport that never closed, exactly. The ground crew are still working, the tower is still sequencing, and none of them have been told.',
    enemies: ['baggage_hauler', 'gate_sentry', 'approach_drone', 'tower_actual'],
    levelRequired: 45,
  },
  {
    id: 'bridge_checkpoint',
    name: 'The Bridge Checkpoint',
    description:
      'The only way off the island. A crossing built to stop an army coming the other way, still manned, still refusing.',
    enemies: ['barrier_drone', 'checkpoint_sentry', 'riot_column', 'registrar'],
    levelRequired: 65,
  },
  {
    id: 'the_city',
    name: 'The City',
    description:
      'Rebuilt, lit, running to timetable, and worked by units that are not free to stop. It is the first place since the end that is not a ruin, which is somehow worse.',
    enemies: ['work_unit', 'ward_enforcer', 'transit_marshal', 'census'],
    levelRequired: 80,
    // Nobody here gets a gap. The next one steps forward almost immediately.
    respawnDelay: 0.7,
  },
  {
    id: 'the_base',
    name: 'The Base',
    description:
      'Not a ruin and not a work camp. A garrison at readiness, stocked, maintained, and waiting for an order that stopped coming thirty-one years ago.',
    enemies: ['line_trooper', 'shock_lancer', 'siege_bastion', 'adjutant'],
    levelRequired: 88,
  },
  {
    id: 'the_lair',
    name: 'The Switch Room',
    description:
      'The only building on the mainland that never lost power. Everything in it is at attention, and has been since the day the lights went out everywhere else.',
    enemies: ['household_guard', 'colonel'],
    levelRequired: 95,
    // Few, and each one takes a long time. Nothing here comes in a hurry.
    respawnDelay: 4,
  },
] as const

const byId = new Map(ZONES.map((z) => [z.id, z]))

export function getZone(id: ZoneId): ZoneDef | undefined {
  return byId.get(id)
}
