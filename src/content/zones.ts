import type { ZoneId } from '../sim/state'

export interface ZoneDef {
  id: ZoneId
  name: string
  description: string
  /** Enemy ids, rolled uniformly on each spawn. */
  enemies: string[]
  /** Minimum combat level (mean of the four combat skills) to deploy. */
  levelRequired: number
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
] as const

const byId = new Map(ZONES.map((z) => [z.id, z]))

export function getZone(id: ZoneId): ZoneDef | undefined {
  return byId.get(id)
}
